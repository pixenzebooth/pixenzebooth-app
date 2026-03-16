export const APP_CONFIG = {
    CANVAS: {
        WIDTH: 1440, // Increased to 1440px
        PHOTO_HEIGHT: 1080, // 4:3 aspect ratio based
        PADDING: 72,
        HEADER_HEIGHT: 280,
        FOOTER_HEIGHT: 200,
        OUTPUT_WIDTH: 1440,
    },
    CAMERA: {
        IDEAL_WIDTH: 1280, // HD — good balance of quality and performance
        IDEAL_HEIGHT: 720,
    },
    VIDEO: {
        RECORDING_DURATION: 6000,
        BITRATE: 1800000, // Balanced: 1.8 Mbps gives much better clarity for 6s clips
        MIME_TYPES: {
            MP4: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
            WEBM_VP9: 'video/webm; codecs=vp9',
            WEBM: 'video/webm'
        }
    },
    IMAGE: {
        QUALITY: 0.85, // Balanced quality (High clarity, still efficient)
        FORMAT: 'image/jpeg' // Switching to JPEG for significantly smaller file size
    },
    GIF: {
        DELAY: 500, // ms per frame
        QUALITY: 10 // quantize quality (lower is better but slower. 10 is fast)
    },
    USER: {
        MAX_FRAMES: 10
    }
};
