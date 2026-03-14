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
        RECORDING_DURATION: 3500,
        BITRATE: 4000000, // 4 Mbps for high quality video
        MIME_TYPES: {
            MP4: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
            WEBM_VP9: 'video/webm; codecs=vp9',
            WEBM: 'video/webm'
        }
    },
    IMAGE: {
        QUALITY: 1.0,
        FORMAT: 'image/png' // Lossless PNG
    },
    GIF: {
        DELAY: 500, // ms per frame
        QUALITY: 10 // quantize quality (lower is better but slower. 10 is fast)
    },
    USER: {
        MAX_FRAMES: 10
    }
};
