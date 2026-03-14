import { APP_CONFIG } from '../config/constants';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { applyLutToImage } from './lutUtils';

export const captureVideoFrame = (videoElement, filter = 'none', cropRatio = null, isMirrored = true) => {
    if (!videoElement) return null;

    // Check if we have a WebGL canvas attached (from FilterCanvas)
    // If so, use it as the source and skip CSS filters (they are already applied)
    // Robust check: Ensure it is actually a Canvas element
    const isWebGL = videoElement._canvas && videoElement._canvas instanceof HTMLCanvasElement;
    const source = isWebGL ? videoElement._canvas : videoElement;

    const canvas = document.createElement('canvas');
    // Calculate dimensions
    let sourceX = 0;
    let sourceY = 0;
    let sourceW = isWebGL ? source.width : source.videoWidth;
    let sourceH = isWebGL ? source.height : source.videoHeight;

    if (cropRatio) {
        const videoRatio = sourceW / sourceH;
        if (videoRatio > cropRatio) {
            // Video is wider than target (e.g. 16:9 > 4:3) - Crop width
            const newW = sourceH * cropRatio;
            sourceX = (sourceW - newW) / 2;
            sourceW = newW;
        } else {
            // Video is taller than target - Crop height
            const newH = sourceW / cropRatio;
            sourceY = (sourceH - newH) / 2;
            sourceH = newH;
        }
        canvas.width = sourceW;
        canvas.height = sourceH;
    } else {
        canvas.width = sourceW;
        canvas.height = sourceH;
    }

    const ctx = canvas.getContext('2d');

    // Flip horizontally only if mirrored
    // Note: WebGL canvas might already be mirrored via transform in CSS, 
    // but drawing it to 2D canvas ignores CSS transforms.
    // However, our FilterCanvas shader/rendering might have mirrored it?
    // FilterCanvas renders with `scale(-1, 1)` css class but does NOT mirror the texture coordinates in the shader (unless we added that).
    // Let's check FilterCanvas... it passes `isMirrored` prop but only uses it for CSS class. 
    // So the actual pixel data in the canvas is NOT mirrored. 
    // We still need to mirror here if isMirrored is true.
    if (isMirrored) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
    }

    // Filter 
    // If filter is a standard CSS filter name, getFilterCss returns the string.
    // If filter is a LUT ID (UUID), getFilterCss returns 'none'.
    // So we can safely apply this logic regardless of source type.
    if (filter !== 'none') {
        ctx.filter = getFilterCss(filter);
    }

    ctx.drawImage(source, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL(APP_CONFIG.IMAGE.FORMAT, APP_CONFIG.IMAGE.QUALITY);
};

export const getFilterCss = (filterName) => {
    switch (filterName) {
        case 'bright': return 'brightness(1.2) contrast(1.1)';
        case 'vintage': return 'sepia(0.4) contrast(1.2)';
        case 'bw': return 'grayscale(1)';
        case 'soft': return 'contrast(0.9) brightness(1.1) blur(0.5px)';
        default: return 'none';
    }
};


export const createStrip = async (photos, configOrTheme = 'pink', filterOverride = null) => {
    // Determine the filter to use: either from config, override, or fallback to 'none'
    const filter = filterOverride || (typeof configOrTheme === 'object' ? configOrTheme.filter : 'none');
    // Determine if we got a simple theme string or a full config object
    const theme = typeof configOrTheme === 'object' ? (configOrTheme.theme || 'pink') : configOrTheme;
    const frameImage = typeof configOrTheme === 'object' ? configOrTheme.frameImage : null;

    // Load Frame Overlay FIRST if it exists to set canvas dimensions
    let overlay = null;
    let canvasWidth = APP_CONFIG.CANVAS.WIDTH;
    let canvasHeight = 0; // Will be calculated

    if (frameImage) {
        overlay = new Image();
        overlay.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
            overlay.onload = resolve;
            overlay.onerror = () => reject(new Error("Failed to load frame overlay"));
            setTimeout(() => reject(new Error("Timeout loading frame overlay")), 15000);
            overlay.src = frameImage;
        });

        canvasWidth = overlay.width;
        canvasHeight = overlay.height;
    } else {
        // Standard Dimensions for default themes
        const photoHeight = APP_CONFIG.CANVAS.PHOTO_HEIGHT;
        const padding = APP_CONFIG.CANVAS.PADDING;
        const headerHeight = APP_CONFIG.CANVAS.HEADER_HEIGHT;
        const footerHeight = APP_CONFIG.CANVAS.FOOTER_HEIGHT;
        canvasHeight = headerHeight + (photos.length * photoHeight) + ((photos.length - 1) * padding) + footerHeight + (padding * 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // Background Colors
    const colors = {
        pink: '#FF99C8',
        blue: '#A9DEF9',
        yellow: '#FCF6BD',
        purple: '#E4C1F9',
        mario: '#6BB5FF',
        red: '#E52521',
        green: '#43B047',
        custom: '#ffffff',
        orange: '#FFA726',
        black: '#212121',
        white: '#FFFFFF',
        teal: '#26A69A',
        navy: '#1A237E',
        lime: '#CDDC39'
    };
    ctx.fillStyle = colors[theme] || colors['pink'];
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // If using default theme, draw branding
    if (!overlay) {
        const darkThemes = ['red', 'green', 'teal', 'navy', 'black'];
        ctx.fillStyle = darkThemes.includes(theme) ? '#ffffff' : '#333';
        // Scaled up font size (96px instead of 32px)
        ctx.font = 'bold 96px "Fredoka", sans-serif';
        ctx.textAlign = 'center';
        // Position adjusted for new header height (header is 240, text at ~165 or roughly 2/3 down?)
        // original 55 is ~68% of 80 header height
        ctx.fillText('PixenzeBooth', canvasWidth / 2, 165);
    }

    // Draw Photos
    // Logic: If overlay exists, try to distribute photos evenly in the center
    // If default, stack with standard padding

    // --- Specific Layout Configurations for Official Frames ---
    const frameLayouts = {
        'perunggu': {
            topMargin: 0.100,   // Adjusted: starts slightly lower
            bottomLimit: 0.71,   // Adjusted: ends higher to avoid band photo
            sideMargin: 0.0,    // Adjusted: narrower photos
            gapRatio: 0.015,     // Tighter vertical gap
        },
        'the1975': {
            topMargin: 0.15,
            bottomLimit: 0.85,
            sideMargin: 0.15,
            gapRatio: 0.04,
        }
        // Add more official frame configs here
    };

    let layout = null;
    if (frameImage) {
        if (frameImage.toLowerCase().includes('perunggu')) layout = frameLayouts['perunggu'];
        else if (frameImage.toLowerCase().includes('the1975')) layout = frameLayouts['the1975'];
    }

    // Default standard metrics
    let photoW = canvasWidth - (APP_CONFIG.CANVAS.PADDING * 2);
    let photoH = APP_CONFIG.CANVAS.PHOTO_HEIGHT;
    let startY = APP_CONFIG.CANVAS.HEADER_HEIGHT + APP_CONFIG.CANVAS.PADDING;
    let gap = APP_CONFIG.CANVAS.PADDING;

    if (overlay) {
        // "Smart" Layout 
        // 1. Determine safe area for photos
        let topM, bottomL, sideM, layoutGap;

        if (layout) {
            // Use specific tuned values (legacy hardcoded)
            topM = canvasHeight * layout.topMargin;
            bottomL = canvasHeight * layout.bottomLimit;
            sideM = canvasWidth * layout.sideMargin;
            layoutGap = layout.gapRatio;
        } else if (typeof configOrTheme === 'object' && configOrTheme.layout_config && (
            Array.isArray(configOrTheme.layout_config) ? configOrTheme.layout_config.length > 0 : (configOrTheme.layout_config.a?.length > 0)
        )) {
            // NEW: Dynamic Layout Config from Supabase — normalize if object
            const slots = Array.isArray(configOrTheme.layout_config)
                ? configOrTheme.layout_config
                : (configOrTheme.layout_config.a || []);
            return createCustomLayoutStrip(ctx, photos, slots, canvasWidth, canvasHeight, overlay, configOrTheme);
        } else {
            // Generic Fallback for user uploads
            topM = canvasHeight * 0.15;
            bottomL = canvasHeight * 0.85;
            sideM = canvasWidth * 0.05;
            layoutGap = 0.04;
        }

        const availableHeight = bottomL - topM;
        const availableWidth = canvasWidth - (sideM * 2);

        // 2. Calculate measurements
        const photoCount = photos.length;
        // Make sure we don't divide by zero if 0 photos (unlikely)
        const ONE_PHOTO_H = availableHeight / (photoCount + (photoCount > 1 ? (photoCount - 1) * layoutGap : 0));

        // Width is determined by the available width
        // BUT we should respect aspect ratio if possible, or crop center.
        // For strips, usually we fix width and height to fill the slot.
        photoW = availableWidth;
        photoH = ONE_PHOTO_H;

        gap = photoH * layoutGap;
        startY = topM;

    } else {
        // ... (Standard default logic remains same as initialized variables)
    }

    for (let i = 0; i < photos.length; i++) {
        let finalPhotoSrc = photos[i];
        if (configOrTheme?.is_lut && configOrTheme?.lutUrl) {
            try {
                finalPhotoSrc = await applyLutToImage(finalPhotoSrc, configOrTheme.lutUrl);
            } catch (e) {
                console.warn("Failed to apply LUT to strip photo", i, e);
            }
        }

        const img = new Image();
        img.crossOrigin = "anonymous"; 
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = () => { resolve(); }; 
            setTimeout(() => resolve(), 5000); 
            img.src = finalPhotoSrc;
        });

        const x = (canvasWidth - photoW) / 2;
        const y = startY + i * (photoH + gap);

        // --- Aspect Ratio Crop (Object-Fit: Cover) ---
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let sx, sy, sw, sh;

        if (imgRatio > targetRatio) {
            sh = img.height;
            sw = sh * targetRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / targetRatio;
            sx = 0;
            // Center crop vertically
            sy = (img.height - sh) / 2;
        }

        // APPLY FILTER
        ctx.save();
        if (filter && filter !== 'none') {
            ctx.filter = getFilterCss(filter);
        }

        if (overlay) {
            ctx.drawImage(img, sx, sy, sw, sh, x - 2, y - 2, photoW + 4, photoH + 4);
        } else {
            // White border for default theme (scaled: 5px -> 15px)
            ctx.fillStyle = 'white';
            ctx.fillRect(x - 15, y - 15, photoW + 30, photoH + 30);
            ctx.drawImage(img, sx, sy, sw, sh, x, y, photoW, photoH);
        }
        ctx.restore();
    }

    // Draw Overlay Frame (Top Layer)
    if (overlay) {
        ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);
    } else {
        // Footer Date for default only (scaled: 16px -> 48px, offset 25 -> 75)
        ctx.font = '48px "Outfit", sans-serif';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(new Date().toLocaleDateString(), canvasWidth / 2, canvasHeight - 75);
    }

    return canvas.toDataURL(APP_CONFIG.IMAGE.FORMAT, APP_CONFIG.IMAGE.QUALITY);
};

// Helper for drawing custom slots defined by admin editor
const createCustomLayoutStrip = async (ctx, photos, slots, canvasWidth, canvasHeight, overlay, config = {}) => {
    // Determine filter ID and LUT info
    const filterId = typeof config === 'object' ? config.filter : config;
    const isLut = typeof config === 'object' ? config.is_lut : false;
    const lutUrl = typeof config === 'object' ? config.lutUrl : null;

    for (let i = 0; i < Math.min(photos.length, slots.length); i++) {
        const slot = slots[i];
        let finalPhotoSrc = photos[i];
        
        // Handle LUT
        if (isLut && lutUrl) {
            try {
                finalPhotoSrc = await applyLutToImage(finalPhotoSrc, lutUrl);
            } catch (err) {
                console.warn("Custom strip LUT error:", err);
            }
        }

        const img = new Image();
        img.crossOrigin = "Anonymous"; // Ensure CORS
        img.src = finalPhotoSrc;
        await new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });

        const x = (slot.x / 100) * canvasWidth;
        const y = (slot.y / 100) * canvasHeight;
        const w = (slot.width / 100) * canvasWidth;
        const h = (slot.height / 100) * canvasHeight;

        const imgRatio = img.width / img.height;
        const targetRatio = w / h;
        let sx, sy, sw, sh;

        if (imgRatio > targetRatio) {
            sh = img.height;
            sw = sh * targetRatio;
            sx = (img.width - sw) / 2;
            sy = 0;
        } else {
            sw = img.width;
            sh = sw / targetRatio;
            sx = 0;
            sy = (img.height - sh) / 2;
        }

        // Apply Filter (Standard CSS)
        ctx.save();
        if (!isLut && filterId && filterId !== 'none') {
            ctx.filter = getFilterCss(filterId);
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
        ctx.restore();
    }

    if (overlay) {
        ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);
    }

    return ctx.canvas.toDataURL(APP_CONFIG.IMAGE.FORMAT, APP_CONFIG.IMAGE.QUALITY);
};


// --- LIVE VIDEO RECORDING FUNCTION ---
export const recordStripVideo = async (liveVideos, photos, configOrTheme = 'pink', onProgress) => {
    // 1. Setup Canvas (Reusing logic from createStrip mostly)
    const theme = typeof configOrTheme === 'object' ? (configOrTheme.theme || 'pink') : configOrTheme;
    const frameImage = typeof configOrTheme === 'object' ? configOrTheme.frameImage : null;
    const isMirrored = typeof configOrTheme === 'object' ? (configOrTheme.isMirrored !== false) : true;

    let overlay = null;
    let canvasWidth = APP_CONFIG.CANVAS.WIDTH;
    let canvasHeight = 0;

    if (frameImage) {
        overlay = new Image();
        overlay.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
            overlay.onload = resolve;
            overlay.onerror = () => reject(new Error("Failed to load video overlay"));
            setTimeout(() => reject(new Error("Timeout loading video overlay")), 15000);
            overlay.src = frameImage;
        });
        canvasWidth = overlay.width;
        canvasHeight = overlay.height;
    } else {
        // Standard Dimensions (High Res)
        const photoHeight = APP_CONFIG.CANVAS.PHOTO_HEIGHT; // 900
        const padding = APP_CONFIG.CANVAS.PADDING; // 60
        const headerHeight = APP_CONFIG.CANVAS.HEADER_HEIGHT; // 240
        const footerHeight = APP_CONFIG.CANVAS.FOOTER_HEIGHT; // 180
        canvasHeight = headerHeight + (photos.length * photoHeight) + ((photos.length - 1) * padding) + footerHeight + (padding * 2);
    }

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // 2. Prepare Video Elements
    // Use liveVideos where available, otherwise fallback to static photos
    const mediaElements = await Promise.all(liveVideos.map(async (videoUrl, i) => {
        if (videoUrl) {
            const vid = document.createElement('video');
            // Handle raw Blob objects (from live recording)
            if (videoUrl instanceof Blob) {
                vid.src = URL.createObjectURL(videoUrl);
            } else {
                vid.src = videoUrl;
            }
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.crossOrigin = "anonymous";
            await vid.play(); // Start playing to get frames
            return { type: 'video', element: vid };
        } else {
            const img = new Image();
            img.src = photos[i];
            await new Promise(resolve => img.onload = resolve);
            return { type: 'image', element: img };
        }
    }));

    // 3. Layout Configuration (Simplified to match createStrip's Custom or Default)
    // We assume layout_config exists for frameImage case given recent updates
    let slots = [];
    if (frameImage && configOrTheme.layout_config) {
        // Normalize: extract flat array from object format
        const rawSlots = Array.isArray(configOrTheme.layout_config)
            ? configOrTheme.layout_config
            : (configOrTheme.layout_config.a || []);
        slots = rawSlots.map(s => ({
            x: (s.x / 100) * canvasWidth,
            y: (s.y / 100) * canvasHeight,
            w: (s.width / 100) * canvasWidth,
            h: (s.height / 100) * canvasHeight
        }));
    } else if (frameImage) {
        // Fallback legacy calculation for official themes if needed, but lets skip for brevity unless critical
        // Assuming users won't use official themes with live video yet or they have layout_config
        // If no layout config but frame image, it's tricky. Let's assume layout_config is populated.
    } else {
        // Default Stack (High Res)
        let photoW = canvasWidth - (APP_CONFIG.CANVAS.PADDING * 2);
        let photoH = APP_CONFIG.CANVAS.PHOTO_HEIGHT;
        let startY = APP_CONFIG.CANVAS.HEADER_HEIGHT + APP_CONFIG.CANVAS.PADDING;
        let gap = APP_CONFIG.CANVAS.PADDING;
        slots = photos.map((_, i) => ({
            x: (canvasWidth - photoW) / 2,
            y: startY + i * (photoH + gap),
            w: photoW,
            h: photoH
        }));
    }

    // 4. Video Recording (MP4/WebM) via MediaRecorder
    // Determine best supported mime type
    const mimeTypes = [
        'video/mp4;codecs=h264',
        'video/mp4',
        'video/webm;codecs=vp9',
        'video/webm'
    ];
    const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

    const stream = canvas.captureStream(30); // 30 FPS
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: APP_CONFIG.VIDEO.BITRATE }); // Customized Bitrate
    const chunks = [];

    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

    return new Promise((resolve, reject) => {
        recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            // Clean up video elements
            mediaElements.forEach(m => { if (m.type === 'video') m.element.pause(); });
            resolve(blob);
        };

        recorder.start();

        const startTime = Date.now();
        const duration = APP_CONFIG.VIDEO.RECORDING_DURATION;

        // Start all videos from beginning
        mediaElements.forEach(m => {
            if (m.type === 'video') {
                m.element.currentTime = 0;
                m.element.play();
            }
        });

        const draw = () => {
            if (Date.now() - startTime > duration) {
                recorder.stop();
                return;
            }

            // Report progress
            if (onProgress) {
                const p = Math.min(1, Math.max(0, (Date.now() - startTime) / duration));
                onProgress(p);
            }

            // Clear & Background
            if (!overlay) {
                const colors = { pink: '#FF99C8' };
                ctx.fillStyle = colors[theme] || '#FF99C8';
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                ctx.font = 'bold 96px "Fredoka", sans-serif';
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.fillText('PixenzeBooth', canvasWidth / 2, 165);
            } else {
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
            }

            // Draw Slots
            slots.forEach((slot, i) => {
                if (i >= mediaElements.length) return;
                const media = mediaElements[i];
                const { x, y, w, h } = slot;

                const element = media.element;
                const eW = media.type === 'video' ? element.videoWidth : element.width;
                const eH = media.type === 'video' ? element.videoHeight : element.height;
                // Safety check for unsized elements
                if (eW === 0 || eH === 0) return;

                const eRatio = eW / eH;
                const targetRatio = w / h;

                let sx, sy, sw, sh;
                if (eRatio > targetRatio) {
                    sh = eH;
                    sw = sh * targetRatio;
                    sx = (eW - sw) / 2;
                    sy = 0;
                } else {
                    sw = eW;
                    sh = sw / targetRatio;
                    sx = 0;
                    sy = (eH - sh) / 2;
                }

                ctx.save();
                
                // Apply Filter (Standard CSS only for now in video)
                const filterId = typeof configOrTheme === 'object' ? configOrTheme.filter : 'none';
                const isLut = typeof configOrTheme === 'object' ? configOrTheme.is_lut : false;
                if (!isLut && filterId && filterId !== 'none') {
                    ctx.filter = getFilterCss(filterId);
                }

                // Apply mirror if video and enabled
                if (media.type === 'video' && isMirrored) {
                    ctx.translate(x + w, y);
                    ctx.scale(-1, 1);
                    ctx.drawImage(element, sx, sy, sw, sh, 0, 0, w, h);
                } else {
                    ctx.drawImage(element, sx, sy, sw, sh, x, y, w, h);
                }
                ctx.restore();
            });

            // Draw Overlay
            if (overlay) {
                ctx.drawImage(overlay, 0, 0, canvasWidth, canvasHeight);
            }

            requestAnimationFrame(draw);
        };

        draw();
    });
};

// --- GIF GENERATION (Live Strip Edition) ---
export const createLiveStripGif = async (liveVideos, photos, configOrTheme = 'pink', onProgress) => {
    // Reuse logic from recordStripVideo to setup the scene
    const theme = typeof configOrTheme === 'object' ? (configOrTheme.theme || 'pink') : configOrTheme;
    const frameImage = typeof configOrTheme === 'object' ? configOrTheme.frameImage : null;
    const isMirrored = typeof configOrTheme === 'object' ? (configOrTheme.isMirrored !== false) : true;

    // 1. Setup Canvas
    let overlay = null;
    let canvasWidth = APP_CONFIG.CANVAS.WIDTH;
    let canvasHeight = 0;

    if (frameImage) {
        overlay = new Image();
        overlay.crossOrigin = "Anonymous";
        await new Promise((resolve, reject) => {
            overlay.onload = resolve;
            overlay.onerror = () => reject(new Error("Failed to load overlay"));
            setTimeout(() => reject(new Error("Timeout loading overlay")), 10000);
            overlay.src = frameImage;
        });
        canvasWidth = overlay.width;
        canvasHeight = overlay.height;
    } else {
        // Standard Dimensions (High Res)
        const photoHeight = APP_CONFIG.CANVAS.PHOTO_HEIGHT;
        const padding = APP_CONFIG.CANVAS.PADDING;
        const headerHeight = APP_CONFIG.CANVAS.HEADER_HEIGHT;
        const footerHeight = APP_CONFIG.CANVAS.FOOTER_HEIGHT;
        canvasHeight = headerHeight + (photos.length * photoHeight) + ((photos.length - 1) * padding) + footerHeight + (padding * 2);
    }

    // Resize for GIF optimization (GIFs get huge at full res)
    // Target width 450px is very small & quick to process, saving >60% payload
    const TARGET_WIDTH = 450;
    const scale = TARGET_WIDTH / canvasWidth;
    const gifWidth = TARGET_WIDTH;
    const gifHeight = Math.floor(canvasHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = gifWidth;
    canvas.height = gifHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    // 2. Prepare Media Elements
    const mediaElements = await Promise.all(liveVideos.map(async (videoUrl, i) => {
        if (videoUrl) {
            const vid = document.createElement('video');
            vid.src = (videoUrl instanceof Blob) ? URL.createObjectURL(videoUrl) : videoUrl;
            vid.muted = true;
            vid.loop = true;
            vid.playsInline = true;
            vid.crossOrigin = "anonymous";
            await vid.play();
            return { type: 'video', element: vid };
        } else {
            const img = new Image();
            img.src = photos[i];
            await new Promise(resolve => img.onload = resolve);
            return { type: 'image', element: img };
        }
    }));

    // 3. Layout Configuration
    let slots = [];
    if (frameImage && configOrTheme.layout_config) {
        const rawSlots = Array.isArray(configOrTheme.layout_config)
            ? configOrTheme.layout_config
            : (configOrTheme.layout_config.a || []);
        slots = rawSlots.map(s => ({
            x: (s.x / 100) * gifWidth, // Scaled coordinates
            y: (s.y / 100) * gifHeight,
            w: (s.width / 100) * gifWidth,
            h: (s.height / 100) * gifHeight
        }));
    } else {
        // Default Stack (Scaled)
        let photoW = gifWidth - (APP_CONFIG.CANVAS.PADDING * scale * 2);
        let photoH = APP_CONFIG.CANVAS.PHOTO_HEIGHT * scale;
        let startY = (APP_CONFIG.CANVAS.HEADER_HEIGHT + APP_CONFIG.CANVAS.PADDING) * scale;
        let gap = APP_CONFIG.CANVAS.PADDING * scale;
        slots = photos.map((_, i) => ({
            x: (gifWidth - photoW) / 2,
            y: startY + i * (photoH + gap),
            w: photoW,
            h: photoH
        }));
    }

    // 4. GIF Encoding
    const gif = new GIFEncoder();
    const FPS = 8; // Lower FPS for smaller size
    // Capture for 3.5 seconds to limit file size
    const duration = 3500;
    const frameInterval = 1000 / FPS;
    const totalFrames = Math.floor(duration / frameInterval);

    // Reset videos to start and slow down playback
    mediaElements.forEach(m => {
        if (m.type === 'video') {
            m.element.currentTime = 0;
            m.element.playbackRate = 0.3; // Slow down to 30% speed (Very Slow)
            m.element.play();
        }
    });

    // Drawing Helper
    const drawFrame = () => {
        // Background
        if (!overlay) {
            ctx.fillStyle = (configOrTheme.theme && configOrTheme.theme !== 'pink') ? '#FFFFFF' : '#FF99C8'; // Simplified bg
            ctx.fillRect(0, 0, gifWidth, gifHeight);
            if (!overlay) {
                ctx.font = `bold ${Math.floor(96 * scale)}px "Fredoka", sans-serif`;
                ctx.fillStyle = '#333';
                ctx.textAlign = 'center';
                ctx.fillText('PixenzeBooth', gifWidth / 2, 165 * scale);
            }
        } else {
            ctx.clearRect(0, 0, gifWidth, gifHeight);
        }

        // Slots
        slots.forEach((slot, i) => {
            if (i >= mediaElements.length) return;
            const media = mediaElements[i];
            const { x, y, w, h } = slot;
            const element = media.element;
            const eW = media.type === 'video' ? element.videoWidth : element.width;
            const eH = media.type === 'video' ? element.videoHeight : element.height;
            if (eW === 0 || eH === 0) return;

            // Draw logic (Aspect Cover)
            const eRatio = eW / eH;
            const targetRatio = w / h;
            let sx, sy, sw, sh;

            if (eRatio > targetRatio) {
                sh = eH; sw = sh * targetRatio; sx = (eW - sw) / 2; sy = 0;
            } else {
                sw = eW; sh = sw / targetRatio; sx = 0; sy = (eH - sh) / 2;
            }

            ctx.save();

            // Apply Filter
            const filterId = typeof configOrTheme === 'object' ? configOrTheme.filter : 'none';
            const isLut = typeof configOrTheme === 'object' ? configOrTheme.is_lut : false;
            if (!isLut && filterId && filterId !== 'none') {
                ctx.filter = getFilterCss(filterId);
            }

            if (media.type === 'video' && isMirrored) {
                ctx.translate(x + w, y);
                ctx.scale(-1, 1);
                ctx.drawImage(element, sx, sy, sw, sh, 0, 0, w, h);
            } else {
                ctx.drawImage(element, sx, sy, sw, sh, x, y, w, h);
            }
            ctx.restore();
        });

        // Overlay
        if (overlay) {
            ctx.drawImage(overlay, 0, 0, gifWidth, gifHeight);
        }
    };

    // Capture Loop
    // Since video.currentTime isn't reliable for precise frame seaking in browser without heavy stutter,
    // we will use a "record live" approach: wait for time to pass.

    // However, for a consistent GIF, we want to capture 'now'.
    // A simple loop with delay might drift, but is acceptable for this use case.

    for (let i = 0; i < totalFrames; i++) {
        drawFrame();

        // Quantize
        const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight).data;
        // Reduce colors for speed/size (from 256 to 64 colors saves huge amount of payload size)
        const palette = quantize(imageData, 64);
        const index = applyPalette(imageData, palette);

        gif.writeFrame(index, gifWidth, gifHeight, { palette, delay: frameInterval });

        // Wait for next frame time roughly
        // This effectively "samples" the playing videos
        await new Promise(r => setTimeout(r, frameInterval));

        if (onProgress) onProgress((i + 1) / totalFrames);
    }

    gif.finish();

    // Cleanup
    mediaElements.forEach(m => {
        if (m.type === 'video') {
            m.element.pause();
            if (m.element.src.startsWith('blob:')) URL.revokeObjectURL(m.element.src);
        }
    });

    return new Blob([gif.bytes()], { type: 'image/gif' });
};

// Helper to convert Data URI to Blob without using fetch (avoids CSP issues)
export const dataURItoBlob = (dataURI) => {
    // convert base64 to raw binary data held in a string
    // doesn't handle URIs without 'base64,' for simplicity as we know our format
    const byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    return new Blob([ab], { type: mimeString });
};

