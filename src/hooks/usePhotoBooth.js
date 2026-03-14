import { useState, useRef, useCallback, useEffect } from 'react';
import { captureVideoFrame } from '../utils/imageUtils';

export const usePhotoBooth = () => {
    const [status, setStatus] = useState('idle'); // idle, countdown, capturing, processing, finished
    const [countdown, setCountdown] = useState(0);
    const [photos, setPhotos] = useState([]);
    const [liveVideos, setLiveVideos] = useState([]);
    const [config, setConfig] = useState({ totalPhotos: 3, filter: 'none', theme: 'pink', isLive: false, isMirrored: true });

    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startSession = useCallback((newConfig) => {
        if (newConfig) setConfig(prev => ({ ...prev, ...newConfig }));
        setPhotos([]);
        setLiveVideos([]);
        setCountdown(3);
        setStatus('countdown');
    }, []);

    useEffect(() => {
        let timer;
        const handleVisibilityChange = () => {
            if (document.hidden && status === 'countdown') {
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        if (status === 'countdown') {
            if (countdown > 0) {
                if (countdown === 2 && config.isLive && videoRef.current) {
                    startRecording();
                }

                timer = setTimeout(() => {
                    setCountdown(prev => prev - 1);
                }, 1000);
            } else if (countdown === 0) {
                capture();
            }
        }
        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [status, countdown, config.isLive]);

    const startRecording = useCallback(() => {
        try {
            if (!videoRef.current) return;

            let stream;
            // Prefer capturing from WebGL canvas to include filters
            if (videoRef.current._canvas) {
                stream = videoRef.current._canvas.captureStream(30); // 30 FPS
            } else if (videoRef.current.srcObject) {
                stream = videoRef.current.srcObject;
            } else {
                return;
            }

            // Detect best supported mime type
            const mimeTypes = [
                'video/mp4;codecs=h264,aac',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm'
            ];
            const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

            if (!mimeType) {
                return;
            }

            const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
            mediaRecorderRef.current = recorder;
            chunksRef.current = []; // Reset chunks

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                // Store Blob directly
                setLiveVideos(prev => {
                    // Ensure we allow nulls if something failed before, but here we just push
                    // We need to keep index sync with photos.
                    // The capture logic handles the sync push, but since this is async stop,
                    // we need to be careful. 
                    // Actually, better strategy: 
                    // We let the capture function handle the 'placeholder' push if needed, 
                    // OR we push here.
                    // IMPORTANT: 'capture' pushes to photos. 'stop' pushes to videos.
                    // If they are out of sync, it's bad.
                    // We will use a ref or simple index matching in Result.
                    return [...prev, blob];
                });
            };

            recorder.start();
        } catch (e) {
        }
    }, [config.filter]);

    const capture = useCallback(() => {
        setStatus('capturing');

        // Capture the photo immediately
        let photo = null;
        if (videoRef.current) {
            photo = captureVideoFrame(videoRef.current, config.filter, 4 / 3, config.isMirrored);
        }

        if (photo) {
            setPhotos(prev => [...prev, photo]);

            // If NOT live, push null video to keep arrays synced
            if (!config.isLive) {
                setLiveVideos(prev => [...prev, null]);
            }
        } else {
            setStatus('countdown');
            setCountdown(3);
            return;
        }

        // Handle Recording Stop
        if (config.isLive && mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // Stop recording after 1.5 seconds to capture post-moment
            setTimeout(() => {
                if (mediaRecorderRef.current.state === 'recording') {
                    mediaRecorderRef.current.stop();
                }
            }, 1500);
        }

        // Proceed to next state
        setTimeout(() => {
            setPhotos(currentPhotos => {
                if (currentPhotos.length >= config.totalPhotos) {
                    // Wait for specific live photo delay if needed
                    setTimeout(() => setStatus('finished'), config.isLive ? 1000 : 500);
                } else {
                    // Next photo
                    setStatus('countdown');
                    setCountdown(3);
                }
                return currentPhotos;
            });
        }, config.isLive ? 1600 : 600); // Wait for recording to finish before potentially starting next countdown

    }, [config.totalPhotos, config.filter, config.isLive, config.isMirrored]);

    const reset = () => {
        setStatus('idle');
        setPhotos([]);
        setLiveVideos([]);
        setCountdown(0);
    };

    return {
        status,
        countdown,
        photos,
        liveVideos,
        setPhotos, // Expose setPhotos manually for uploads
        config,
        setConfig,
        startSession,
        reset,
        setStatus,
        setCountdown,
        videoRef
    };
};
