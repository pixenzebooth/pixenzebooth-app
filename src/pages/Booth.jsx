import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from '../context/AlertContext';
import { usePhotoBooth } from '../hooks/usePhotoBooth';
import { createStrip } from '../utils/imageUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ArrowLeft, Zap, Trash2, Star } from 'lucide-react';
import CameraView from '../components/CameraView';
import CameraSelector from '../components/CameraSelector';
import ImageEditor from '../components/ImageEditor';

// Refactored Components
import Inventory from '../components/booth/Inventory';
import HUDOverlay from '../components/booth/HUDOverlay';

const Booth = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { showAlert } = useAlert();
    const { status, countdown, photos, liveVideos, setPhotos, startSession, reset, setStatus, setCountdown, videoRef, config, setConfig } = usePhotoBooth();

    const [showInventory, setShowInventory] = useState(false);
    const [editorImage, setEditorImage] = useState(null);
    const [flashOn, setFlashOn] = useState(false);


    const cameraControlsRef = useRef(null);
    const [showCameraSelector, setShowCameraSelector] = useState(false);

    useEffect(() => {
        if (state?.preConfig) {
            const pre = state.preConfig;
            // Safety: normalize layout_config if it's still an object
            let lc = pre.layout_config;
            if (lc && !Array.isArray(lc)) {
                lc = lc.a || [];
                pre.layout_config = lc;
            }
            let count = pre.totalPhotos || 3;
            if (lc && Array.isArray(lc) && lc.length > 0) {
                count = lc.length;
            }
            setConfig(prev => ({ ...prev, ...pre, totalPhotos: count }));
        }
    }, [state, setConfig]);

    const handleStart = () => {
        if (status === 'finished') {
            navigate('/preview', { state: { photos, config, liveVideos } });
            return;
        }
        if (photos.length > 0) {
            setStatus('countdown');
            setCountdown(3);
        } else {
            startSession(config);
        }
    };

    const handleRemovePhoto = (index) => {
        setPhotos(prev => prev.filter((_, i) => i !== index));
        if (status === 'finished') {
            setStatus('idle');
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Security validation
        const MAX_SIZE = 15 * 1024 * 1024; // 15MB
        const SAFE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/jpg'];

        if (!SAFE_TYPES.includes(file.type)) {
            showAlert('Invalid file type. Only JPEG, PNG, and WebP images allowed.', 'error');
            e.target.value = '';
            return;
        }

        if (file.size > MAX_SIZE) {
            showAlert('File is too large. Maximum 15MB.', 'error');
            e.target.value = '';
            return;
        }

        if (photos.length < config.totalPhotos) {
            const reader = new FileReader();
            reader.onload = (f) => {
                // Open editor instead of directly adding
                setEditorImage(f.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            showAlert(`Full! Delete a photo to upload more.`, 'error');
        }
        e.target.value = '';
    };

    const handleEditorConfirm = (processedImage) => {
        setEditorImage(null);
        setPhotos(prev => {
            const newPhotos = [...prev, processedImage];
            if (newPhotos.length >= config.totalPhotos) {
                setStatus('finished');
            }
            return newPhotos;
        });
    };

    const handleEditorCancel = () => {
        setEditorImage(null);
    };



    // Simplified Booth focuses only on capture.
    // Filter selection moved to Result page.
    useEffect(() => {
        setConfig(prev => ({ ...prev, filter: 'none' }));
    }, []);

    return (
        <div className="h-screen w-full font-nunito flex flex-col overflow-hidden relative select-none bg-white">
            {/* Same decorations... */}
            <motion.div
                animate={{ rotate: [0, 10, -10, 0], y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="hidden md:block absolute top-20 left-10 text-game-primary pointer-events-none opacity-20"
            >
                <Zap size={48} fill="currentColor" />
            </motion.div>
            <motion.div
                animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                className="hidden md:block absolute top-32 right-20 text-game-primary pointer-events-none opacity-20"
            >
                <Star size={36} fill="currentColor" />
            </motion.div>

            {/* === HEADER === */}
            <header className="flex-none h-20 px-6 py-4 flex items-center justify-between z-30 relative">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/select-frame')}
                    className="w-12 h-12 btn-game-danger rounded-xl flex items-center justify-center shadow-game"
                >
                    <ArrowLeft size={24} strokeWidth={3} />
                </motion.button>

                <div className="flex flex-col items-center justify-center w-64 md:w-96">
                    <h1 className="font-titan text-game-primary text-xl tracking-wider mb-2 uppercase drop-shadow-sm text-stroke-sm">
                        {config.name || 'CUSTOM'}
                    </h1>
                    <div className="w-full bg-gray-200 h-4 rounded-full border-2 border-black p-0.5 shadow-inner">
                        <motion.div
                            className="h-full bg-game-primary rounded-full border border-black/10"
                            animate={{ width: `${Math.min(100, (photos.length / config.totalPhotos) * 100)}% ` }}
                        />
                    </div>
                </div>

                {/* Camera device selector (desktop only) */}
                {cameraControlsRef.current?.devices?.length > 1 && (
                    <CameraSelector
                        devices={cameraControlsRef.current.devices}
                        selectedDeviceId={cameraControlsRef.current.selectedDeviceId}
                        onSelectDevice={(id) => cameraControlsRef.current.selectDevice(id)}
                        isOpen={showCameraSelector}
                        onToggle={() => setShowCameraSelector(prev => !prev)}
                    />
                )}

                <div className="bg-white text-game-primary font-mono font-black text-xl px-4 py-2 rounded-xl border-4 border-black shadow-game min-w-[80px] text-center">
                    {photos.length}/{config.totalPhotos}
                </div>
            </header>

            {/* === MAIN CONTENT === */}
            <main className="flex-1 min-h-0 flex items-center justify-center gap-4 md:gap-8 p-4 z-20">
                {/* CAMERA PREVIEW */}
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative bg-black rounded-3xl md:rounded-[2rem] border-4 md:border-[6px] border-black shadow-game-lg overflow-hidden w-[95vw] h-auto aspect-[4/3] md:w-auto md:h-[min(65vh,48.75vw)]"
                    >
                        {/* Camera Feed */}
                        <div className="w-full h-full relative">
                            <div className="w-full h-full">
                                <div className="absolute inset-0 z-0">
                                    <CameraView
                                        ref={cameraControlsRef}
                                        onReady={(el) => {
                                            // CameraView passes the video element directly now
                                            if (el) videoRef.current = el;
                                        }}
                                        isMirrored={config.isMirrored}
                                    />
                                </div>
                            </div>
                        </div>

                        <HUDOverlay 
                            config={config}
                            setConfig={setConfig}
                            onSwitchCamera={() => cameraControlsRef.current?.switchCamera()}
                            onToggleFlash={() => {
                                if (cameraControlsRef.current) {
                                    cameraControlsRef.current.toggleFlash();
                                    setFlashOn(prev => !prev);
                                }
                            }}
                            flashOn={flashOn}
                        />

                        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,0,0,0)_50%,rgba(0,0,0,0.25)_50%)] bg-[length:100%_4px] opacity-20"></div>

                        <AnimatePresence>
                            {status === 'countdown' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
                                >
                                    <div className="flex flex-col items-center">
                                        <motion.span
                                            key={countdown}
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1.5, opacity: 1 }}
                                            exit={{ scale: 2, opacity: 0 }}
                                            className="font-titan text-8xl md:text-[120px] text-game-secondary drop-shadow-[4px_4px_0_#000] text-stroke mb-8"
                                        >
                                            {countdown}
                                        </motion.span>

                                        <motion.button
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            whileHover={{ scale: 1.1 }}
                                            onClick={() => setCountdown(0)}
                                            className="px-6 py-2 bg-white/20 backdrop-blur-md border-2 border-white text-white font-titan rounded-full hover:bg-white hover:text-black transition-colors"
                                        >
                                            SKIP
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <AnimatePresence>
                            {status === 'capturing' && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 1, 0] }}
                                    className="absolute inset-0 bg-white z-[60]"
                                />
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>

                <Inventory 
                    config={config}
                    photos={photos}
                    onRemove={handleRemovePhoto}
                    showInventory={showInventory}
                    onToggleInventory={() => setShowInventory(prev => !prev)}
                />
            </main>

            {/* === FOOTER: PRIMARY ACTIONS === */}
            <footer className="flex-none bg-white border-t-4 border-black p-4 md:p-8 z-30 flex items-center justify-center relative shadow-[0_-4px_20px_rgba(0,0,0,1)]">
                <div className="flex-none">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleStart}
                        disabled={status !== 'idle' && status !== 'finished'}
                        className={`h-16 md:h-20 px-8 md:px-16 rounded-2xl flex items-center justify-center gap-3 shadow-game text-white transition min-w-[240px] ${
                            status === 'finished'
                                ? 'btn-game-success !text-black border-4 border-black'
                                : 'btn-game-primary border-4 border-black'
                        }`}
                    >
                        {status === 'finished' ? (
                            <>
                                <span className="font-titan tracking-wider text-xl uppercase">View Preview</span>
                                <ArrowLeft size={28} className="rotate-180" strokeWidth={3} />
                            </>
                        ) : (
                            <>
                                <Camera size={28} strokeWidth={2.5} />
                                <span className="font-titan tracking-wider text-xl uppercase">Take Photos</span>
                            </>
                        )}
                    </motion.button>
                </div>
            </footer>

            {/* Mobile Inventory Toggle (Small pill button) */}
            <div className="lg:hidden fixed bottom-32 right-6 z-40">
                <button
                    onClick={() => setShowInventory(true)}
                    className="flex flex-col items-center gap-1 bg-white text-game-primary w-14 h-14 rounded-full border-4 border-black shadow-game active:scale-95 transition-transform overflow-hidden"
                >
                    <span className="font-titan text-[10px] mt-1 uppercase">INV</span>
                    <span className="font-black text-lg -mt-1">{photos.length}</span>
                </button>
            </div>

            {/* Image Editor Modal */}
            {editorImage && (
                <ImageEditor
                    imageSrc={editorImage}
                    aspectRatio={4 / 3}
                    onConfirm={handleEditorConfirm}
                    onCancel={handleEditorCancel}
                />
            )}
        </div>
    );
};

export default Booth;
