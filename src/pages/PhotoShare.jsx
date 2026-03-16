import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Camera, Home, ExternalLink, AlertCircle, Star, Zap, ChevronLeft, ChevronRight, Play, FileJson } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';

const PhotoShare = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    const [assets, setAssets] = useState([]); // List of { type, url, name }
    const [activeIndex, setActiveIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        const fetchAllAssets = async () => {
            try {
                const searchParams = new URLSearchParams(location.search);
                const idParam = searchParams.get('id');
                const imgParam = searchParams.get('img');

                if (!idParam && !imgParam) {
                    navigate('/');
                    return;
                }

                let foundAssets = [];

                if (idParam && supabase) {
                    // 1. Fetch the primary record to get the actual file_path basename
                    // This is necessary because the DB 'id' is a random UUID from the server,
                    // but siblings share the same basename in their 'file_path'.
                    const { data: primary, error: primaryErr } = await supabase
                        .from('photos')
                        .select('file_path, photo_url')
                        .eq('id', idParam)
                        .single();

                    if (primaryErr || !primary) {
                        console.error('[PhotoShare] Primary record not found:', primaryErr);
                    } else {
                        // Extract baseId from "photos/temp/EVENT_ID/UUID_OR_NAME.jpg"
                        const filename = primary.file_path.split('/').pop();
                        const baseId = filename.split('.')[0].split('_raw')[0];
                        console.log(`[PhotoShare] Basename extracted: ${baseId}`);

                        // 2. Query ALL photos matching this UUID prefix in storage path
                        // We use a broader wildcard %baseId% to find siblings across /hot/ and /cold/ folders
                        const { data, error } = await supabase
                            .from('photos')
                            .select('photo_url, file_path, id')
                            .like('file_path', `%${baseId}%`)
                            .order('created_at', { ascending: true });


                        if (!error && data && data.length > 0) {
                            foundAssets = data.map(item => {
                                const path = item.file_path.toLowerCase();
                                let type = 'raw';
                                let label = 'PHOTO';

                                if (path.endsWith('.gif')) {
                                    type = 'gif';
                                    label = 'ANIMATION';
                                } else if (path.endsWith('.mp4') || path.endsWith('.webm')) {
                                    type = 'video';
                                    label = 'VIDEO';
                                } else if (item.id === idParam || (!path.includes('_raw') && path.endsWith('.jpg'))) {
                                    type = 'strip';
                                    label = 'PHOTOSTRIP';
                                }

                                return {
                                    type,
                                    label,
                                    url: item.photo_url,
                                    name: item.file_path.split('/').pop()
                                };
                            });
                            
                            // Sort: Strip first, then GIF/Video, then Raws
                            foundAssets.sort((a, b) => {
                                const order = { 'strip': 0, 'gif': 1, 'video': 2, 'raw': 3 };
                                return order[a.type] - order[b.type];
                            });
                        }
                    }
                }

                // Fallback for direct img param
                if (foundAssets.length === 0 && imgParam) {
                    foundAssets = [{ type: 'strip', label: 'PREVIEW', url: imgParam, name: 'moment.jpg' }];
                }

                if (foundAssets.length > 0) {
                    setAssets(foundAssets);
                } else {
                    console.warn('[PhotoShare] No assets detected');
                    navigate('/');
                }
            } catch (e) {
                console.error('[PhotoShare] Initialization error:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchAllAssets();
    }, [location, navigate]);

    const activeAsset = assets[activeIndex];

    const handleDownload = async () => {
        if (!activeAsset || isDownloading) return;
        setIsDownloading(true);
        
        try {
            const res = await fetch(activeAsset.url);
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = activeAsset.name || `pixenze-${activeAsset.type}-${Date.now()}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (error) {
            window.open(activeAsset.url, '_blank');
        } finally {
            setIsDownloading(false);
        }
    };

    const nextAsset = () => setActiveIndex((prev) => (prev + 1) % assets.length);
    const prevAsset = () => setActiveIndex((prev) => (prev - 1 + assets.length) % assets.length);

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-white font-titan text-game-primary animate-pulse text-2xl">
            INITIALIZING GALLERY...
        </div>
    );

    if (!activeAsset) return null;

    return (
        <div className="min-h-screen font-nunito flex flex-col items-center justify-center p-4 py-12 relative overflow-y-auto overflow-x-hidden">
            {/* Background Pattern */}
            <div className="fixed inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            {/* Decorations */}
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 4 }} className="fixed top-16 right-8 md:right-24 z-0">
                <Star className="w-8 h-8 text-game-secondary" fill="currentColor" />
            </motion.div>
            <motion.div animate={{ y: [0, 20, 0], scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 3 }} className="fixed bottom-32 left-8 md:left-24 z-0">
                <Zap className="w-7 h-7 text-game-primary" fill="currentColor" />
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full flex flex-col items-center z-10"
            >
                {/* Header Logo */}
                <div className="flex flex-col items-center mb-6">
                    <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2 }} className="bg-game-primary p-3 rounded-2xl border-4 border-black shadow-game mb-4">
                        <Camera className="w-8 h-8 text-white" />
                    </motion.div>
                    <h1 className="text-3xl font-titan tracking-wider text-game-primary text-stroke-sm drop-shadow-game-lg uppercase">
                        PIXENZEBOOTH
                    </h1>
                    <p className="font-mono font-bold text-[10px] text-game-accent tracking-[.3em] mt-2">DOWNLOAD CENTER</p>
                </div>

                {/* Slider Component */}
                <div className="relative w-full mb-8">
                    <div className="card-game w-full p-2 md:p-3 relative group shadow-game-lg overflow-hidden">
                        {/* Tape Effect */}
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-8 bg-white/30 backdrop-blur-md rotate-2 z-30 shadow-sm border-l border-r border-white/40"></div>
                        
                        {/* Badge */}
                        <div className="absolute top-4 left-4 z-30 bg-game-primary text-white font-titan text-[10px] px-3 py-1 rounded-full border-2 border-black shadow-sm">
                            {activeAsset.label}
                        </div>

                        <div className="bg-game-dark border-4 border-black rounded-xl overflow-hidden min-h-[400px] flex items-center justify-center relative">
                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={activeIndex}
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.3 }}
                                    className="w-full h-full flex items-center justify-center p-2"
                                >
                                    {activeAsset.type === 'video' ? (
                                        <video
                                            src={activeAsset.url}
                                            autoPlay
                                            loop
                                            muted
                                            playsInline
                                            className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                                        />
                                    ) : (
                                        <img
                                            src={activeAsset.url}
                                            alt={activeAsset.label}
                                            className="w-full h-auto max-h-[60vh] object-contain rounded-lg"
                                        />
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Pagination Dots */}
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-30">
                            {assets.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-2 h-2 rounded-full border border-black/20 ${i === activeIndex ? 'bg-game-primary w-4' : 'bg-white/50'} transition-all`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    {assets.length > 1 && (
                        <>
                            <button 
                                onClick={prevAsset}
                                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-game hover:scale-110 active:scale-95 transition-all z-40"
                            >
                                <ChevronLeft size={24} className="text-black" />
                            </button>
                            <button 
                                onClick={nextAsset}
                                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-game hover:scale-110 active:scale-95 transition-all z-40"
                            >
                                <ChevronRight size={24} className="text-black" />
                            </button>
                        </>
                    )}
                </div>

                {/* Counter Label */}
                <div className="mb-6 font-titan text-game-primary text-sm tracking-widest bg-white/50 px-4 py-1 rounded-full border-2 border-dashed border-game-primary/30">
                    ITEM {activeIndex + 1} OF {assets.length}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-1 gap-4 w-full px-2">
                    <motion.button
                        whileHover={{ scale: 1.05, y: -4 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={`w-full py-4 btn-game-primary flex flex-col items-center justify-center shadow-game transition-all ${isDownloading ? 'opacity-70 grayscale' : ''}`}
                    >
                        <div className="flex items-center gap-3 text-xl">
                            <Download size={24} strokeWidth={3} />
                            {isDownloading ? 'DOWNLOADING...' : 'SAVE TO GALLERY'}
                        </div>
                        <span className="text-[10px] font-mono font-bold mt-1 opacity-80 italic">
                            {activeAsset.label} CONTENT
                        </span>
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => navigate('/')}
                        className="w-full py-3 btn-game-secondary flex items-center justify-center gap-2 text-lg shadow-game transition-all"
                    >
                        <Home size={20} />
                        BACK TO HOME
                    </motion.button>
                </div>

                {/* Footer Info */}
                <div className="mt-12 opacity-50 text-center">
                    <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-game-accent">
                        &copy; {new Date().getFullYear()} PIXENZEBOOTH
                    </p>
                    <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase">Event Driven Photobooth Experience</p>
                </div>
            </motion.div>
        </div>
    );
};

export default PhotoShare;
