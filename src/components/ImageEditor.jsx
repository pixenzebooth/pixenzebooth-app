import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, RotateCcw, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { APP_CONFIG } from '../config/constants';

const ImageEditor = ({ imageSrc, onConfirm, onCancel, aspectRatio = 4 / 3 }) => {
    const containerRef = useRef(null);
    const [image, setImage] = useState(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

    // Transform state
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [rotation, setRotation] = useState(0);

    // Interaction refs
    const isDragging = useRef(false);
    const dragPointerId = useRef(null);
    const lastPointer = useRef({ x: 0, y: 0 });
    const lastPinchDist = useRef(0);
    const animFrame = useRef(null);

    const MIN_SCALE = 0.3;
    const MAX_SCALE = 4;

    // Load image
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            setImage(img);
            // Calculate initial scale to fill the crop area
            const cropW = containerSize.width || 300;
            const cropH = cropW / aspectRatio;
            const imgRatio = img.width / img.height;
            const cropRatio = aspectRatio;

            let initScale;
            if (imgRatio > cropRatio) {
                initScale = cropH / img.height;
            } else {
                initScale = cropW / img.width;
            }
            setScale(initScale * 1.05); // Slight overscale to ensure coverage
            setPosition({ x: 0, y: 0 });
            setRotation(0);
        };
        img.src = imageSrc;
    }, [imageSrc, containerSize.width, aspectRatio]); // Added dependencies

    // Measure container
    useEffect(() => {
        const measure = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setContainerSize({ width: rect.width, height: rect.height });
            }
        };
        measure();
        window.addEventListener('resize', measure);
        return () => window.removeEventListener('resize', measure);
    }, []);

    // Constraint logic for responsive crop area
    const getCropDimensions = useCallback(() => {
        if (!containerSize.width || !containerSize.height) return { width: 0, height: 0, left: 0, top: 0 };

        // Desktop: Max 800px width, 70% height
        // Mobile: 90% width, 60% height
        const isDesktop = containerSize.width > 768;
        const maxWidth = isDesktop ? Math.min(containerSize.width * 0.8, 800) : containerSize.width * 0.9;
        const maxHeight = containerSize.height * (isDesktop ? 0.7 : 0.65);

        let w = maxWidth;
        let h = w / aspectRatio;

        if (h > maxHeight) {
            h = maxHeight;
            w = h * aspectRatio;
        }

        return {
            width: w,
            height: h,
            left: (containerSize.width - w) / 2,
            top: (containerSize.height - h) / 2
        };
    }, [containerSize, aspectRatio]);

    const { width: cropW, height: cropH, left: cropX, top: cropY } = getCropDimensions();

    // Recalculate initial scale when container size changes
    useEffect(() => {
        if (image && cropW > 0) {
            // Logic to fit image into crop area initially
            const imgRatio = image.width / image.height;
            let initScale;
            if (imgRatio > aspectRatio) {
                initScale = cropH / image.height;
            } else {
                initScale = cropW / image.width;
            }
            // Only reset if seemingly uninitialized or drastic change? 
            // Actually usually better to preserve relative scale? 
            // For now keep original logic to ensure fit.
            if (scale === 1) setScale(initScale * 1.05);
        }
    }, [cropW, cropH, image, aspectRatio]); // Removed scale from dep to avoid loop, but added check

    // --- REFACTORED POINTER EVENTS ---
    const handlePointerDown = useCallback((e) => {
        // Prevent multi-touch dragging issues: only allow one pointer to drag at a time
        if (isDragging.current) return;
        if (e.pointerType === 'touch' && !e.isPrimary) return;

        isDragging.current = true;
        dragPointerId.current = e.pointerId;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e) => {
        // Only process the pointer that started the drag
        if (!isDragging.current || e.pointerId !== dragPointerId.current) return;

        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        lastPointer.current = { x: e.clientX, y: e.clientY };
        setPosition(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }, []);

    const handlePointerUp = useCallback((e) => {
        if (e.pointerId === dragPointerId.current) {
            isDragging.current = false;
            dragPointerId.current = null;
        }
    }, []);

    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            lastPinchDist.current = dist;
        }
    }, []);

    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); // Prevent page scroll
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = dist - lastPinchDist.current;
            lastPinchDist.current = dist;
            setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta * 0.002)));
        }
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        setScale(prev => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev - e.deltaY * zoomSpeed)));
    }, []);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener('wheel', handleWheel, { passive: false });
        // prevent default touch actions to stop scrolling on mobile
        el.style.touchAction = 'none';
        return () => el.removeEventListener('wheel', handleWheel);
    }, [handleWheel]);

    const handleZoomIn = () => setScale(prev => Math.min(MAX_SCALE, prev * 1.2));
    const handleZoomOut = () => setScale(prev => Math.max(MIN_SCALE, prev / 1.2));
    const handleRotateCW = () => setRotation(prev => prev + 90);
    const handleRotateCCW = () => setRotation(prev => prev - 90);
    const handleReset = () => {
        setPosition({ x: 0, y: 0 });
        setRotation(0);
        if (image && cropW > 0) {
            const imgRatio = image.width / image.height;
            let initScale;
            if (imgRatio > aspectRatio) {
                initScale = cropH / image.height;
            } else {
                initScale = cropW / image.width;
            }
            setScale(initScale * 1.05);
        }
    };

    const handleConfirm = () => {
        if (!image) return;
        if (cropW === 0) return;

        // Output canvas - Adaptive width (max 1200px, but don't upscale small images)
        const outputW = Math.min(APP_CONFIG.CANVAS.OUTPUT_WIDTH, image.naturalWidth || image.width);
        const outputH = outputW / aspectRatio;
        const canvas = document.createElement('canvas');
        canvas.width = outputW;
        canvas.height = outputH;
        const ctx = canvas.getContext('2d');

        // Scale factor from screen crop to output
        const scaleFactor = outputW / cropW;

        ctx.save();
        ctx.translate(outputW / 2, outputH / 2);
        ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
        ctx.rotate((rotation * Math.PI) / 180);
        const finalScale = scale * scaleFactor;
        ctx.scale(finalScale, finalScale);
        ctx.drawImage(image, -image.width / 2, -image.height / 2);
        ctx.restore();

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        onConfirm(dataUrl);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-game-dark/95 backdrop-blur-xl font-nunito"
            >
                {/* Header */}
                <div className="flex-none w-full px-4 py-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent">
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={onCancel}
                        className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-game hover:bg-gray-100 transition-colors border-2 border-black"
                    >
                        <X size={24} strokeWidth={3} />
                    </motion.button>

                    <h2 className="font-titan text-game-primary text-2xl tracking-wider drop-shadow-md text-stroke-sm">ADJUST PHOTO</h2>

                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleConfirm}
                        className="w-12 h-12 bg-game-success text-black rounded-full flex items-center justify-center shadow-game hover:brightness-110 transition-all border-2 border-black"
                    >
                        <Check size={24} strokeWidth={4} />
                    </motion.button>
                </div>

                {/* Editor Area */}
                <div
                    ref={containerRef}
                    className="flex-1 w-full relative overflow-hidden cursor-move active:cursor-grabbing select-none"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    style={{ touchAction: 'none' }}
                >
                    {/* Image Layer */}
                    {image && (
                        <div
                            className="absolute will-change-transform"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg) scale(${scale})`,
                                transformOrigin: 'center center',
                                transition: isDragging.current ? 'none' : 'transform 0.1s ease-out',
                            }}
                        >
                            <img
                                src={imageSrc}
                                alt="Edit"
                                className="pointer-events-none select-none max-w-none"
                                draggable={false}
                            />
                        </div>
                    )}

                    {/* Dark Mask Overlay */}
                    {cropW > 0 && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div className="absolute inset-0 bg-black/70">
                                {/* Cutout using mask or just layout divs? Layout divs is simpler for click-through if needed, but here overlay blocks. */}
                                {/* Actually we want overlay to be VISIBLE but transparency inside crop. */}
                            </div>

                            {/* Re-implement masking with clip-path or simple divs. Simple divs approach: */}
                            {/* Top */}
                            <div className="absolute left-0 right-0 top-0 bg-black/80 backdrop-blur-sm" style={{ height: `${cropY}px` }} />
                            {/* Bottom */}
                            <div className="absolute left-0 right-0 bottom-0 bg-black/80 backdrop-blur-sm" style={{ height: `${containerSize.height - (cropY + cropH)}px` }} />
                            {/* Left */}
                            <div className="absolute left-0 bg-black/80 backdrop-blur-sm" style={{ top: `${cropY}px`, height: `${cropH}px`, width: `${cropX}px` }} />
                            {/* Right */}
                            <div className="absolute right-0 bg-black/80 backdrop-blur-sm" style={{ top: `${cropY}px`, height: `${cropH}px`, width: `${containerSize.width - (cropX + cropW)}px` }} />

                            {/* Crop Border & Grid */}
                            <div
                                className="absolute border-4 border-white shadow-[0_0_20px_rgba(0,0,0,0.5)] box-border"
                                style={{
                                    left: `${cropX}px`,
                                    top: `${cropY}px`,
                                    width: `${cropW}px`,
                                    height: `${cropH}px`,
                                }}
                            >
                                {/* Grid lines */}
                                <div className="absolute inset-0 opacity-40">
                                    <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50 shadow-[0_0_2px_black]" />
                                    <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50 shadow-[0_0_2px_black]" />
                                    <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50 shadow-[0_0_2px_black]" />
                                    <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50 shadow-[0_0_2px_black]" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {!image && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-game-primary font-titan text-xl animate-pulse">LOADING...</div>
                        </div>
                    )}
                </div>

                {/* Controls Bar */}
                <div className="flex-none w-full px-4 py-6 z-20">
                    <div className="max-w-md mx-auto bg-black/40 backdrop-blur-md border-2 border-white/20 rounded-2xl p-2 flex items-center justify-between gap-2 shadow-2xl">
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleRotateCCW}
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <RotateCcw size={20} />
                        </motion.button>

                        <div className="w-px h-8 bg-white/20" />

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleZoomOut}
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ZoomOut size={20} />
                        </motion.button>

                        <div className="min-w-[50px] text-center font-mono font-bold text-game-accent">
                            {Math.round(scale * 100)}%
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleZoomIn}
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <ZoomIn size={20} />
                        </motion.button>

                        <div className="w-px h-8 bg-white/20" />

                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleReset}
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <RefreshCw size={20} />
                        </motion.button>
                    </div>

                    {/* Mobile Actions (redundant with header? No, header has X and Check. We can remove bottom buttons to save space or keep them for thumb access) 
                         The design usually has top actions for modal. Let's keep bottom for clear "Confirm". 
                     */}
                    <div className="flex items-center justify-center gap-4 mt-4 md:hidden">
                        <button onClick={handleRotateCCW} className="p-2 bg-white/10 rounded-full text-white"><RotateCcw size={18} /></button>
                        <button onClick={handleZoomOut} className="p-2 bg-white/10 rounded-full text-white"><ZoomOut size={18} /></button>
                        <button onClick={handleZoomIn} className="p-2 bg-white/10 rounded-full text-white"><ZoomIn size={18} /></button>
                        <div className="text-white/50 text-xs font-mono ml-2">Use gestures to pinch/zoom</div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ImageEditor;
