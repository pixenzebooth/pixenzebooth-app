import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, ArrowRight, Star } from 'lucide-react';
import { getOptimizedUrl, supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

const ExclusivePopup = ({ exclusiveFrames, onSelectFrame }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mediaUrl, setMediaUrl] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const { data } = await supabase.from('global_settings').select('announcement_url').eq('id', 1).single();
                if (data?.announcement_url) {
                    setMediaUrl(data.announcement_url);
                }
            } catch (e) {
                console.error("Failed to load exclusive media url:", e);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        // Only show if there are exclusive frames AND user hasn't seen it this session
        if (exclusiveFrames && exclusiveFrames.length > 0) {
            const hasSeen = sessionStorage.getItem('hasSeenExclusivePopup');
            if (!hasSeen) {
                // Short delay before popping up smoothly
                const timer = setTimeout(() => {
                    setIsOpen(true);

                    // Trigger golden confetti explosion
                    const duration = 3000;
                    const end = Date.now() + duration;

                    const frame = () => {
                        confetti({
                            particleCount: 5,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                            colors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#ffffff'] // Gold palette
                        });
                        confetti({
                            particleCount: 5,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                            colors: ['#fbbf24', '#f59e0b', '#d97706', '#fcd34d', '#ffffff']
                        });

                        if (Date.now() < end) {
                            requestAnimationFrame(frame);
                        }
                    };
                    frame();

                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [exclusiveFrames]);

    const handleClose = () => {
        setIsOpen(false);
        sessionStorage.setItem('hasSeenExclusivePopup', 'true');
    };

    const handleSelect = (frame) => {
        handleClose();
        // Slight delay to allow popup to close before selecting
        setTimeout(() => {
            onSelectFrame(frame);
        }, 300);
    };

    // Use the first exclusive frame as the highlight
    const highlightFrame = exclusiveFrames?.[0];

    return (
        <AnimatePresence>
            {isOpen && highlightFrame && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="relative max-w-sm w-full"
                    >
                        {/* Golden Glowing Border Decor */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-600 rounded-3xl blur opacity-70 animate-pulse"></div>

                        <div className="relative bg-zinc-950 border-2 border-yellow-500/50 rounded-3xl p-6 shadow-2xl overflow-hidden flex flex-col items-center text-center">

                            {/* Abstract Glow Background */}
                            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-60" />
                            <div className="absolute -top-12 -left-12 w-40 h-40 bg-yellow-500/20 rounded-full blur-[50px] pointer-events-none" />
                            <div className="absolute -bottom-12 -right-12 w-40 h-40 bg-orange-600/20 rounded-full blur-[50px] pointer-events-none" />

                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-all z-20"
                            >
                                <X size={20} />
                            </button>

                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            >
                                <Crown className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] mb-2" fill="currentColor" />
                            </motion.div>

                            <h2 className="font-titan text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 mb-1 tracking-widest leading-none drop-shadow-md">
                                OUT NOW!
                            </h2>
                            <p className="text-zinc-400 font-nunito text-sm font-bold tracking-wide mb-6">
                                Exclusive frame available now.
                            </p>

                            <div className="relative inline-block rounded-xl overflow-hidden mb-6 shadow-[0_0_30px_rgba(250,204,21,0.4)] group">
                                <div className="absolute inset-0 border-4 border-yellow-500 rounded-xl z-20 pointer-events-none transition-transform duration-700 group-hover:scale-105"></div>
                                {mediaUrl ? (
                                    mediaUrl.match(/\.(mp4|webm)$/i) ? (
                                        <video src={mediaUrl} autoPlay loop playsInline className="block w-auto h-auto max-w-[260px] max-h-[340px] md:max-w-[300px] md:max-h-[380px] object-cover group-hover:scale-105 transition-transform duration-700" />
                                    ) : (
                                        <img src={mediaUrl} alt={highlightFrame.name} className="block w-auto h-auto max-w-[260px] max-h-[340px] md:max-w-[300px] md:max-h-[380px] object-cover group-hover:scale-105 transition-transform duration-700" />
                                    )
                                ) : (
                                    <img
                                        src={getOptimizedUrl(highlightFrame.thumbnail || highlightFrame.image, 500)}
                                        alt={highlightFrame.name}
                                        className="block w-auto h-auto max-w-[260px] max-h-[340px] md:max-w-[300px] md:max-h-[380px] object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                )}
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-3 px-2 z-10 flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-yellow-500 tracking-widest uppercase mb-0.5 drop-shadow-md">EDITION</span>
                                    <p className="text-sm font-black text-white text-center truncate w-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-wide">{highlightFrame.name}</p>
                                </div>


                                <Star className="absolute bottom-16 right-3 text-white z-30 animate-pulse" style={{ animationDelay: '0.5s' }} fill="currentColor" size={12} />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSelect(highlightFrame)}
                                className="w-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-black font-titan text-lg py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                            >
                                USE THIS FRAME <ArrowRight size={20} />
                            </motion.button>

                            <button
                                onClick={handleClose}
                                className="mt-4 text-xs font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest"
                            >
                                Maybe Later
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ExclusivePopup;
