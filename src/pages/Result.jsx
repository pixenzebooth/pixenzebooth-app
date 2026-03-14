import React, { useEffect, useState, useRef } from 'react';
import { useAlert } from '../context/AlertContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { createStrip, recordStripVideo, createLiveStripGif, getFilterCss } from '../utils/imageUtils';
import { RotateCcw, Star, X, Zap, FolderUp, User, Mail } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { uploadPhoto, blobUrlToBlob, dataURItoBlob } from '../services/photoUploadService';
import { checkCampaignStatus, submitWinner } from '../services/campaignService';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTenant } from '../context/TenantContext';
import { useEvent } from '../context/EventContext';
import ConfirmationModal from '../components/ConfirmationModal';
import FilteredImage from '../components/FilteredImage';
import FilterCanvas from '../components/FilterCanvas';
import { motion, AnimatePresence } from 'framer-motion';

// Refactored Modals
import QRModal from '../components/modals/QRModal';
import DownloadOptionsModal from '../components/modals/DownloadOptionsModal';
import CampaignModal from '../components/modals/CampaignModal';

const Result = () => {
    const { state } = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const reducedMotion = useReducedMotion();
    const { tenantId } = useTenant();
    const { activeEventId } = useEvent();
    const [stripUrl, setStripUrl] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState(''); // Status text during upload
    const [qrUrl, setQrUrl] = useState('');
    const [showQrModal, setShowQrModal] = useState(false);

    // Campaign State
    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [showLiveReplay, setShowLiveReplay] = useState(false);
    const [campaignData, setCampaignData] = useState({ name: '', whatsapp: '', address: '' });
    const [campaignLoading, setCampaignLoading] = useState(false);
    const [sessionId] = useState(() => crypto.randomUUID().slice(0, 8).toUpperCase());

    const [showDownloadOptions, setShowDownloadOptions] = useState(false);
    const [downloadingVideo, setDownloadingVideo] = useState(false);
    const [liveVideoUrls, setLiveVideoUrls] = useState([]);
    const [showConfirmRetake, setShowConfirmRetake] = useState(false);
    const hiddenVideosRef = useRef({}); // Store refs for video elements by index

    useEffect(() => {
        if (state?.photos) {
            const generate = async () => {
                try {
                    const url = await createStrip(state.photos, state.config);
                    setStripUrl(url);
                } catch (error) {
                    showAlert("Failed to generate your photo strip. Please try again.", "error");
                    navigate('/');
                }
            };
            generate();
        } else {
            navigate('/');
        }
    }, [state, navigate]);

    const [isCampaignActive, setIsCampaignActive] = useState(false);
    const [campaignRemaining, setCampaignRemaining] = useState(0);

    // Check Campaign Eligibility
    useEffect(() => {
        const verifyCampaign = async () => {
            if (stripUrl) {
                const status = await checkCampaignStatus();
                if (status.active) {
                    setIsCampaignActive(true);
                    setCampaignRemaining(status.remaining);
                }
            }
        };
        verifyCampaign();
    }, [stripUrl]);

    const handleCampaignSubmit = async (e) => {
        e.preventDefault();
        setCampaignLoading(true);

        try {
            // 1. Upload Photo to Storage
            const blob = await blobUrlToBlob(stripUrl);
            const uploadResult = await uploadPhoto(activeEventId, blob, `winner_${sessionId}.jpg`, null, (s) => setUploadStatus(s));

            const winnerPayload = {
                ...campaignData,
                user_id: user?.id || null,
                photo_url: uploadResult.photo_url // Permanent Storage Link
            };

            const result = await submitWinner(winnerPayload);

            if (result.success) {
                showAlert("CONGRATULATIONS! You secured your spot!", "success");
                setShowCampaignModal(false);
            } else {
                showAlert(result.message, "error");
            }
        } catch (err) {
            showAlert("Error claiming reward: " + err.message, "error");
        } finally {
            setCampaignLoading(false);
            setUploadStatus('');
        }
    };

    const handleDownload = () => {
        if (state?.liveVideos && state.liveVideos.some(v => v)) {
            setShowDownloadOptions(true);
        } else {
            processImageDownload();
        }
    };

    const handleShare = async () => {
        if (!activeEventId) {
            showAlert("Session expired or event not found.", "error");
            return;
        }

        // Rate limiting
        const lastUpload = localStorage.getItem('last_r2_upload');
        if (lastUpload && Date.now() - Number(lastUpload) < 15000) { // 15 seconds for R2
            showAlert('Please wait a few seconds before generating another QR code.', 'info');
            setShowQrModal(true);
            return;
        }

        setUploading(true);
        try {
            setUploadStatus('Processing photo strip...');
            const blob = await blobUrlToBlob(stripUrl);
            
            setUploadStatus('Uploading to Cloudflare R2...');
            const result = await uploadPhoto(activeEventId, blob, `strip_${Date.now()}.jpg`, null, (s) => setUploadStatus(s));

            if (!result.photo_url) {
                throw new Error("Upload failed, no URL returned.");
            }

            localStorage.setItem('last_r2_upload', Date.now());

            // Save metadata to Supabase (History)
            if (user && supabase) {
                try {
                    await supabase.from('history').insert([{
                        user_id: user.id,
                        url: result.photo_url,
                        created_at: new Date()
                    }]);
                } catch (historyErr) {
                    console.warn("Failed to save history:", historyErr);
                }
            }

            // Generate QR Code Share Link
            // Note: We use window.location.origin if it's production-like, or fall back to the hardcoded domain
            const currentOrigin = window.location.origin;
            const productionDomain = currentOrigin.includes('pixenzebooth.com') ? currentOrigin : 'https://app.pixenzebooth.com';
            
            // Construction: Domain + /#/share?img=...
            const shareUrl = `${productionDomain}/#/share?img=${encodeURIComponent(result.photo_url)}`;
            setQrUrl(shareUrl);
            console.log(`[Result] Generated Share URL: ${shareUrl}`);
            setShowQrModal(true);
            showAlert("SUCCESS! Scan the QR code to download!", "success");

        } catch (err) {
            console.error('Share failed:', err);
            showAlert("Failed to share: " + err.message, "error");
        } finally {
            setUploading(false);
            setUploadStatus('');
        }
    };

    const processImageDownload = () => {
        const link = document.createElement('a');
        link.download = `pixenze-booth-${Date.now()}.jpg`;
        link.href = stripUrl;
        link.click();
        showAlert("Photo strip saved to your device!", "success");
    };

    const processVideoDownload = async () => {
        setDownloadingVideo(true);
        try {
            const blob = await recordStripVideo(liveVideoUrls, state.photos, state.config);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
            link.download = `pixenze-booth-live-${Date.now()}.${ext}`;
            link.href = url;
            link.click();
            showAlert(`Live video saved as .${ext.toUpperCase()}!`, "success");
            setShowDownloadOptions(false);
        } catch (e) {
            showAlert("Failed to generate video.", "error");
        } finally {
            setDownloadingVideo(false);
        }
    };

    const processGifDownload = async () => {
        setDownloadingVideo(true);
        try {
            // Updated to use Live Strip GIF generator
            const blob = await createLiveStripGif(liveVideoUrls, state.photos, state.config, (p) => {
                // Optional: Update progress UI
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `pixenze-booth-live-${Date.now()}.gif`;
            link.href = url;
            link.click();
            showAlert("Animated GIF saved to your device!", "success");
            setShowDownloadOptions(false);
        } catch (e) {
            showAlert("Failed to generate GIF.", "error");
        } finally {
            setDownloadingVideo(false);
        }
    };



    const handleRetake = () => {
        navigate('/');
    };



    if (!stripUrl) return (
        <div className="flex justify-center items-center h-screen font-titan text-xl md:text-2xl animate-pulse text-game-accent">
            LOADING...
        </div>
    );



    return (
        <div className="min-h-screen font-nunito flex flex-col items-center justify-start lg:justify-center p-4 pt-10 lg:pt-4 relative overflow-y-auto overflow-x-hidden">

            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            {/* Animated Background Blobs */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 180, 360]
                }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                className="hidden md:block fixed top-1/4 left-1/4 w-[400px] h-[400px] bg-game-accent/20 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{
                    scale: [1.1, 1, 1.1],
                    x: [0, 30, 0],
                    y: [0, -20, 0]
                }}
                transition={{ repeat: Infinity, duration: 15, ease: "easeInOut" }}
                className="hidden md:block fixed bottom-1/3 right-1/4 w-[500px] h-[500px] bg-game-success/15 blob-optimized rounded-full pointer-events-none"
            ></motion.div>

            {/* Floating Stars — Hidden on mobile for performance */}
            {!reducedMotion && (
                <>
                    <motion.div
                        animate={{
                            y: [0, -15, 0],
                            rotate: [0, 360]
                        }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                        className="fixed top-16 right-12 md:right-24"
                    >
                        <Star className="w-8 h-8 md:w-10 md:h-10 text-game-accent" fill="currentColor" />
                    </motion.div>

                    <motion.div
                        animate={{
                            y: [0, 20, 0],
                            scale: [1, 1.3, 1]
                        }}
                        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        className="fixed top-32 left-12 md:left-24"
                    >
                        <Zap className="w-7 h-7 md:w-9 md:h-9 text-game-primary" fill="currentColor" />
                    </motion.div>
                </>
            )}

            <div className="text-center mb-6 md:mb-8 z-10 w-full">
                <motion.h1
                    initial={{ scale: 0.8, y: -30 }}
                    animate={{
                        scale: 1,
                        y: [0, -10, 0]
                    }}
                    transition={{
                        scale: { duration: 0.5 },
                        y: reducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }
                    }}
                    className="text-3xl sm:text-5xl md:text-7xl font-titan text-game-primary text-stroke drop-shadow-[5px_5px_0_#000]"
                >
                    MISSION COMPLETE!
                </motion.h1>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 md:gap-8 items-center justify-center z-10 w-full max-w-6xl">

                {/* Result Strip Preview */}
                {/* Result Strip Preview (LIVE FRAME) */}
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                        rotate: [0, -2, 0, 2, 0]
                    }}
                    transition={{
                        scale: { type: 'spring', bounce: 0.5 },
                        rotate: reducedMotion ? { duration: 0 } : { repeat: Infinity, duration: 4, ease: "easeInOut" }
                    }}
                    className="bg-zinc-800 p-3 md:p-4 pb-10 md:pb-12 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-white relative group max-w-[90vw]"
                >
                    {/* Tape Effect */}
                    <div className="absolute -top-3 md:-top-4 left-1/2 -translate-x-1/2 w-24 md:w-32 h-8 md:h-10 bg-white/20 backdrop-blur-sm rotate-2 z-20 shadow-sm border-l border-r border-white/30"></div>

                    {stripUrl ? (
                        <div className="relative shadow-inner bg-white overflow-hidden max-h-[50vh] md:max-h-[60vh]">
                            {/* Live Frame Assembly */}
                            {(state.liveVideos && (() => {
                                const lc = state.config?.layout_config;
                                const slots = !lc ? [] : Array.isArray(lc) ? lc : (lc.a || []);
                                return slots.length > 0 && state.config.frameImage;
                            })()) ? (
                                <div className="relative inline-block w-auto h-auto">
                                    {/* 1. Underlying Slots (Videos/Photos) */}
                                    <div className="absolute inset-0 w-full h-full z-0">
                                        {(Array.isArray(state.config.layout_config) ? state.config.layout_config : (state.config.layout_config?.a || [])).map((slot, i) => (
                                            <div
                                                key={i}
                                                className="absolute overflow-hidden bg-gray-200"
                                                style={{
                                                    left: `${slot.x}%`,
                                                    top: `${slot.y}%`,
                                                    width: `${slot.width}%`,
                                                    height: `${slot.height}%`,
                                                }}
                                            >
                                                {state.liveVideos[i] ? (
                                                    state.config?.is_lut ? (
                                                        <div className="w-full h-full relative">
                                                            <video
                                                                ref={el => hiddenVideosRef.current[i] = el}
                                                                src={liveVideoUrls[i]}
                                                                autoPlay
                                                                loop
                                                                muted
                                                                playsInline
                                                                className="hidden"
                                                            />
                                                            <FilterCanvas
                                                                videoElement={hiddenVideosRef.current[i]}
                                                                lutUrl={state.config.lutUrl}
                                                                isMirrored={state.config?.isMirrored !== false}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <video
                                                            src={liveVideoUrls[i]}
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            className={`w-full h-full object-cover ${state.config?.isMirrored !== false ? 'transform -scale-x-100' : ''}`}
                                                            style={{
                                                                filter: getFilterCss(state.config.filter)
                                                            }}
                                                        />
                                                    )
                                                ) : (
                                                    <FilteredImage
                                                        src={state.photos[i]}
                                                        filter={state.config}
                                                        className="w-full h-full"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* 2. Frame Overlay (Top) */}
                                    <img
                                        src={state.config.frameImage}
                                        alt="Frame"
                                        className="relative z-10 w-full h-auto pointer-events-none max-h-[50vh] md:max-h-[60vh] object-contain block"
                                    />
                                </div>
                            ) : (state.liveVideos && !state.config?.frameImage) ? (
                                // Default Theme Live View (Vertical Stack)
                                <div className={`flex flex-col p-4 gap-4 items-center`} style={{ backgroundColor: '#FF99C8' }}>
                                    {state.photos.map((photo, i) => (
                                        <div key={i} className="relative w-64 h-48 bg-black border-4 border-white shadow-sm overflow-hidden">
                                            {state.liveVideos[i] ? (
                                                <video 
                                                    src={liveVideoUrls[i]} 
                                                    autoPlay 
                                                    loop 
                                                    muted 
                                                    playsInline 
                                                    className={`w-full h-full object-cover ${state.config?.isMirrored !== false ? 'transform -scale-x-100' : ''}`} 
                                                    style={{ filter: getFilterCss(state.config.filter) }}
                                                />
                                            ) : (
                                                <img 
                                                    src={photo} 
                                                    className="w-full h-full object-cover" 
                                                    style={{ filter: getFilterCss(state.config.filter) }}
                                                    alt={`Captured photo ${i + 1}`} 
                                                />
                                            )}
                                        </div>
                                    ))}
                                    <div className="font-bold font-mono text-black text-center mt-2">PixenzeBooth</div>
                                </div>
                            ) : (
                                // Fallback Static Image
                                <img src={stripUrl} alt="Photostrip" className="max-h-[50vh] md:max-h-[60vh] object-contain block" />
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-96 w-32 bg-gray-200 animate-pulse text-gray-400 font-mono text-sm">GENERATING...</div>
                    )}
                </motion.div>

                {/* Action Panel */}
                <div className="flex flex-col gap-4 w-full lg:w-auto min-w-[90vw] sm:min-w-0 sm:w-full md:w-auto md:min-w-[300px]">
                    <motion.div
                        initial={{ x: 50, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="card-game bg-game-surface text-black border-4 p-5 md:p-6"
                    >
                        <h2 className="text-xl md:text-2xl font-titan text-game-primary mb-4 border-b-4 border-black pb-2 text-stroke-sm">DATA SAVE</h2>

                        <div className="space-y-3">
                            {isCampaignActive && (
                                <motion.button
                                    whileHover={{ scale: 1.05, y: -4 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowCampaignModal(true)}
                                    className="w-full py-4 btn-game-primary text-white flex items-center justify-center gap-2 text-lg md:text-xl md:animate-pulse shadow-[0_0_15px_rgba(186,28,22,0.6)] z-10 relative"
                                >
                                    <Star size={24} fill="currentColor" /> CLAIM FREE PRINT ({campaignRemaining} LEFT)
                                </motion.button>
                            )}

                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleShare}
                                disabled={uploading}
                                className="w-full py-3 btn-game-primary flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-50"
                            >
                                {uploading ? <RotateCcw className="animate-spin" size={20} /> : <Zap size={20} fill="currentColor" />}
                                {uploading ? uploadStatus || "SHARING..." : "SCAN QR CODE"}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02, y: -4 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowConfirmRetake(true)}
                                className="w-full py-3 btn-game-accent flex items-center justify-center gap-2 text-sm md:text-base text-black"
                            >
                                <RotateCcw size={20} /> REPLAY MISSION
                            </motion.button>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="bg-game-dark border-4 border-black p-4 rounded-xl text-center shadow-game"
                    >
                        <p className="text-game-success text-xs font-mono mb-1">SESSION ID: {sessionId}</p>
                        <p className="text-game-accent font-bold text-sm">THANK YOU FOR PLAYING!</p>
                    </motion.div>
                </div>
            </div>

            {/* LIVE REPLAY MODAL */}
            <AnimatePresence>
                {showLiveReplay && state?.liveVideos && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/95">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-game-primary border-[6px] border-black p-4 md:p-6 rounded-3xl max-w-2xl w-full relative shadow-[8px_8px_0_#000] text-center max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setShowLiveReplay(false)}
                                className="absolute top-4 right-4 text-white/70 hover:text-white hover:scale-110 transition-transform z-10"
                                aria-label="Close Live Replay"
                            >
                                <X size={32} strokeWidth={3} />
                            </button>

                            <h2 className="text-2xl md:text-3xl font-titan text-white mb-6 drop-shadow-md flex items-center justify-center gap-3">
                                <div className="w-4 h-4 md:w-6 md:h-6 rounded-full border-4 border-white flex items-center justify-center">
                                    <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full"></div>
                                </div>
                                LIVE MOMENTS
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {state.liveVideos.map((videoUrl, idx) => videoUrl && (
                                    <div key={idx} className="aspect-[3/4] bg-black rounded-xl border-4 border-black overflow-hidden relative shadow-md">
                                        {state.config?.is_lut ? (
                                            <FilterCanvas
                                                videoElement={document.getElementById(`replay-video-${idx}`)}
                                                lutUrl={state.config.lutUrl}
                                                isMirrored={state.config?.isMirrored !== false}
                                            />
                                        ) : null}
                                        <video
                                            id={`replay-video-${idx}`}
                                            src={videoUrl}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className={`w-full h-full object-cover ${state.config?.is_lut ? 'hidden' : (state.config?.isMirrored !== false ? 'transform scale-x-[-1]' : '')}`}
                                            style={{ filter: !state.config?.is_lut ? getFilterCss(state.config.filter) : 'none' }}
                                            controls={!state.config?.is_lut}
                                            aria-label={`Live moment video ${idx + 1}`}
                                        />
                                        <div className="absolute bottom-2 right-2 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-mono font-bold border border-white/50">
                                            #{idx + 1}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* DOWNLOAD OPTIONS MODAL */}
            <DownloadOptionsModal
                isOpen={showDownloadOptions}
                onClose={() => setShowDownloadOptions(false)}
                onDownloadJpg={processImageDownload}
                onDownloadVideo={processVideoDownload}
                onDownloadGif={processGifDownload}
                isGenerating={downloadingVideo}
            />



            {/* LUCKY WINNER CAMPAIGN MODAL */}
            <CampaignModal
                isOpen={showCampaignModal}
                onClose={() => setShowCampaignModal(false)}
                onSubmit={handleCampaignSubmit}
                isLoading={campaignLoading}
                campaignData={campaignData}
                setCampaignData={setCampaignData}
            />

            {/* QR CODE MODAL */}
            <QRModal
                isOpen={showQrModal}
                onClose={() => setShowQrModal(false)}
                qrUrl={qrUrl}
            />

            {/* RETAKE CONFIRMATION MODAL */}
            <ConfirmationModal
                isOpen={showConfirmRetake}
                onClose={() => setShowConfirmRetake(false)}
                onConfirm={handleRetake}
                title="REPLAY MISSION?"
                message="Are you sure you want to start over? Your current photo strip will be lost if not saved!"
            />


        </div>
    );
};

export default Result;
