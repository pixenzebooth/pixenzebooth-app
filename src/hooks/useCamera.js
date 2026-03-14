import { useState, useEffect, useRef, useCallback } from 'react';
import { APP_CONFIG } from '../config/constants';

const CAMERA_STORAGE_KEY = 'gaskenn_selected_camera';

export const useCamera = () => {
    const videoRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState("user");
    const streamRef = useRef(null);

    // Device selection
    const [devices, setDevices] = useState([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState(() => {
        try {
            return localStorage.getItem(CAMERA_STORAGE_KEY) || null;
        } catch {
            return null;
        }
    });

    // Detect if running on desktop (Electron)
    const isDesktop = !!window.electronAPI;

    // Enumerate video devices
    const enumerateDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices?.enumerateDevices) return;

            // Need to request permission first to get device labels
            try {
                const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                tempStream.getTracks().forEach(track => track.stop());
            } catch (e) {
                // Permission denied or no camera
            }

            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
            setDevices(videoDevices);

            // If no device selected yet, try to use stored or first device
            if (!selectedDeviceId && videoDevices.length > 0) {
                const storedId = localStorage.getItem(CAMERA_STORAGE_KEY);
                const storedExists = videoDevices.some(d => d.deviceId === storedId);
                if (storedId && storedExists) {
                    setSelectedDeviceId(storedId);
                }
            }
        } catch (err) {
            console.error('Failed to enumerate devices:', err);
        }
    }, [selectedDeviceId]);

    // Enumerate on mount
    useEffect(() => {
        enumerateDevices();
    }, [enumerateDevices]);

    // Listen for device changes (new camera plugged in, etc.)
    useEffect(() => {
        const handler = () => enumerateDevices();
        navigator.mediaDevices?.addEventListener('devicechange', handler);
        return () => navigator.mediaDevices?.removeEventListener('devicechange', handler);
    }, [enumerateDevices]);

    const selectDevice = useCallback((deviceId) => {
        setSelectedDeviceId(deviceId);
        try {
            localStorage.setItem(CAMERA_STORAGE_KEY, deviceId);
        } catch (e) {
            // Ignore
        }
    }, []);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    }, []);

    const startCamera = async () => {
        stopCamera();
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error("Camera API is not available (Check HTTPS or Device)");
            }

            // Build video constraints
            const videoConstraints = {
                width: { ideal: isDesktop ? 1920 : APP_CONFIG.CAMERA.IDEAL_WIDTH },
                height: { ideal: isDesktop ? 1080 : APP_CONFIG.CAMERA.IDEAL_HEIGHT },
                aspectRatio: { ideal: 1.333333 },
            };

            // Use specific device if selected, otherwise use facingMode
            if (selectedDeviceId) {
                videoConstraints.deviceId = { exact: selectedDeviceId };
            } else {
                videoConstraints.facingMode = facingMode;
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: videoConstraints,
                audio: false,
            });

            setStream(mediaStream);
            streamRef.current = mediaStream;

            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
                videoRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        // Ignore: rapid switching
                    }
                });
            }
            setError(null);

            // Re-enumerate after successful start to refresh labels
            enumerateDevices();
        } catch (err) {
            setError(err.message || "Could not access camera");
        }
    };

    const switchCamera = () => {
        if (selectedDeviceId && devices.length > 1) {
            // Cycle through devices
            const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
            const nextIndex = (currentIndex + 1) % devices.length;
            selectDevice(devices[nextIndex].deviceId);
        } else {
            setFacingMode(prev => prev === "user" ? "environment" : "user");
        }
    };

    // Re-start camera when facingMode or selectedDeviceId changes
    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, [facingMode, selectedDeviceId]);

    const [isFlashOn, setIsFlashOn] = useState(false);
    const [hasFlash, setHasFlash] = useState(false);

    useEffect(() => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            let capabilities = {};
            try {
                capabilities = track.getCapabilities ? track.getCapabilities() : {};
            } catch (e) { /* Safari */ }

            if (capabilities.torch) {
                setHasFlash(true);
            } else {
                setHasFlash(false);
            }
            setIsFlashOn(false);
        }
    }, [stream]);

    const toggleFlash = async () => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const newFlashState = !isFlashOn;

            if (hasFlash) {
                try {
                    await track.applyConstraints({
                        advanced: [{ torch: newFlashState }]
                    });
                } catch (e) { /* Ignore */ }
            }

            setIsFlashOn(newFlashState);
        }
    };

    return {
        videoRef,
        stream,
        error,
        startCamera,
        stopCamera,
        switchCamera,
        facingMode,
        toggleFlash,
        isFlashOn,
        hasFlash,
        // New device selection exports
        devices,
        selectedDeviceId,
        selectDevice,
        enumerateDevices,
    };
};
