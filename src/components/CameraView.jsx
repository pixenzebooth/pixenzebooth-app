
import React, { useEffect, useState, useRef } from 'react';
import { useCamera } from '../hooks/useCamera';
import { Camera, AlertCircle, RotateCcw } from 'lucide-react';
import FilterCanvas from './FilterCanvas';

const CameraView = React.forwardRef(({ onReady, onStreamCallback, isMirrored = true, activeFilter }, ref) => {
    const { videoRef, stream, error, startCamera, switchCamera, facingMode, toggleFlash, isFlashOn, hasFlash, devices, selectedDeviceId, selectDevice } = useCamera();
    const [videoEl, setVideoEl] = useState(null);

    // Expose controls to parent
    React.useImperativeHandle(ref, () => ({
        switchCamera,
        facingMode,
        toggleFlash,
        isFlashOn,
        hasFlash,
        devices,
        selectedDeviceId,
        selectDevice,
    }));

    // We need to capture the canvas ref to pass it up if needed (e.g. for recording)
    // But currently onReady expects a ref object that has .current = videoElement.
    // If we switch to canvas recording, we might need to expose the canvas.
    // For now, let's expose the video element as primary ref for compatibility, 
    // but we might need a separate callback for the "render canvas".
    const canvasRef = useRef(null);

    // Removed direct startCamera() call as useCamera hook handles it internally on mount via facingMode effect

    useEffect(() => {
        if (videoRef.current) {
            setVideoEl(videoRef.current);
        }
    }, [videoRef]);

    useEffect(() => {
        if (videoEl && onReady) {
            onReady(videoEl);
        }
    }, [videoEl, onReady]);

    useEffect(() => {
        if (stream && onStreamCallback) {
            onStreamCallback(stream);
        }
    }, [stream, onStreamCallback]);

    const handleCanvasReady = (canvas) => {
        // ... (existing code)
        if (videoRef.current) {
            videoRef.current._canvas = canvas;
        }
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-brand-pink/20 rounded-2xl h-full border-4 border-red-400 bg-white">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h3 className="text-xl font-bold font-fredoka text-gray-800 mb-2">Camera Error</h3>
                <p className="text-center text-gray-600 mb-6 px-4">
                    {error.name === 'NotAllowedError'
                        ? "Permission denied. Please allow camera access in your browser settings."
                        : "We can't access your camera. It might be in use by another app."}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-red-500 text-white font-bold rounded-full hover:bg-red-600 transition-colors shadow-lg"
                >
                    Retry Access
                </button>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-3xl shadow-xl border-4 border-white bg-black w-full h-full">
            {!stream && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
                    <Camera className="animate-pulse mr-2" />
                    <span>Starting Camera...</span>
                </div>
            )}

            {/* Hidden Source Video */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 opacity-0 pointer-events-none w-px h-px"
            />

            {/* WebGL Canvas Filter Wrapper */}
            {videoEl && (
                <FilterCanvas
                    videoElement={videoEl}
                    lutUrl={activeFilter?.storage_path}
                    intensity={1.0}
                    isMirrored={isMirrored}
                    onCanvasReady={handleCanvasReady}
                />
            )}

            {/* PC Flash Simulation Overlay */}
            {isFlashOn && !hasFlash && (
                <div className="absolute inset-0 bg-white/40 pointer-events-none z-50 mix-blend-overlay animate-pulse"
                    style={{ boxShadow: 'inset 0 0 100px 50px rgba(255,255,255,0.8)' }}></div>
            )}
        </div>
    );
});

export default CameraView;
