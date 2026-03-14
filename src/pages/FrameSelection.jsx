import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Mail, Heart, Sparkles, Star, Lock, Zap, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getFrames } from '../services/frames';
import { getOptimizedUrl } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../context/ThemeContext';
import { useTenant } from '../context/TenantContext';
import { useAlert } from '../context/AlertContext';
import { resolveLayoutSlots, hasMultipleLayouts as checkMultipleLayouts, getLayoutImage } from '../utils/layoutUtils';
import LetterPopup from '../components/LetterPopup';
import AnimationOverlay from '../components/AnimationOverlay';
import { getMyLetters } from '../services/letters';
import { Helmet } from 'react-helmet-async';
import ExclusivePopup from '../components/ExclusivePopup';

const ComingSoonModal = React.lazy(() => import('../components/ComingSoonModal'));

const FrameSelection = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [selectedFrame, setSelectedFrame] = useState(null);
    const [selectedLayout, setSelectedLayout] = useState('a'); // Default to layout 'a'
    const [showComingSoon, setShowComingSoon] = useState(false);
    const { setTheme } = useTheme();
    const { showAlert } = useAlert();
    const [frames, setFrames] = useState([]);
    const [specialFrames, setSpecialFrames] = useState([]);
    const [exclusiveFrames, setExclusiveFrames] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedArtist, setSelectedArtist] = useState('all');
    const observerTarget = useRef(null);
    const [artists, setArtists] = useState(['Default']);
    const [visibleLimit, setVisibleLimit] = useState(16);
    const [activeLetter, setActiveLetter] = useState(null);
    const [availableLetters, setAvailableLetters] = useState([]);

    const checkLetters = async () => {
        // Removed user check to allow public letters
        try {
            const letters = await getMyLetters();

            const seenLetters = JSON.parse(localStorage.getItem('seen_letters') || '[]');
            const unseenLetters = letters.filter(l => !seenLetters.includes(l.id));

            setAvailableLetters(letters);

            if (unseenLetters.length > 0) {
                setActiveLetter(unseenLetters[0]);
            }
        } catch {
        }
    };

    const handleCloseLetter = () => {
        if (activeLetter) {
            const seenLetters = JSON.parse(localStorage.getItem('seen_letters') || '[]');
            if (!seenLetters.includes(activeLetter.id)) {
                seenLetters.push(activeLetter.id);
                localStorage.setItem('seen_letters', JSON.stringify(seenLetters));
            }
        }
        setActiveLetter(null);
    };

    // Check for letters on mount/auth change
    useEffect(() => {
        checkLetters();
    }, [user]);

    // Reset pagination when filter changes
    useEffect(() => {
        setVisibleLimit(16);
    }, [selectedArtist]);

    // Handle Dynamic Theme — driven by per-frame config from admin panel
    useEffect(() => {
        if (!selectedFrame) return;

        // Read theme config from the frame data (set in admin panel)
        const frameTheme = selectedFrame.theme_id || 'default';
        const frameAudio = selectedFrame.audio_url || null;

        setTheme({ themeId: frameTheme, audioUrl: frameAudio });

        return () => {
            // We don't reset theme on unmount because they might navigate to Booth.jsx
        };
    }, [selectedFrame, setTheme]);

    // Filter frames based on selection
    const filteredFrames = frames.filter(f => selectedArtist === 'all' || f.artist === selectedArtist);

    // Infinite Scroll Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && visibleLimit < filteredFrames.length) {
                    setVisibleLimit(prev => prev + 12);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current);
            }
        };
    }, [observerTarget, visibleLimit, filteredFrames]);

    // Basic Themes (Hardcoded for now as fallbacks/options)
    const basicThemes = [
        {
            id: 'basic-game',
            type: 'basic',
            name: 'Pixel Classic',
            color: 'bg-game-primary',
            stats: { style: 'Retro', vibes: 'Old School' },
            rarity: 'Common',
            artist: 'System',
            layout_config: { a: [], b: [], images: {} }
        }
    ];

    const { tenantId } = useTenant();

    useEffect(() => {
        loadData();
    }, [user, tenantId]); // Re-run when user auth state or tenant changes

    const loadData = async () => {
        try {
            const dbFrames = await getFrames(tenantId);

            const userEmail = user?.email?.toLowerCase();

            const formattedDbFrames = dbFrames
                .filter(f => {
                    // Status Check (Forgiving for older databases where status might be null/missing)
                    const currentStatus = f.status ? f.status.toLowerCase() : 'active';
                    if (currentStatus !== 'active' && currentStatus !== 'coming_soon') return false;

                    // Allowed Emails Check
                    if (f.allowed_emails && f.allowed_emails.length > 0) {
                        // If no user is logged in, hide restricted frames
                        if (!userEmail) return false;

                        // Check if user is in the allowed list (case-insensitive done by backend usually, but safe to double check)
                        const allowed = f.allowed_emails.map(e => e.toLowerCase());
                        if (!allowed.includes(userEmail)) return false;
                    }

                    return true;
                })
                .map(f => ({
                    id: f.id,
                    type: 'custom',
                    name: f.name,
                    image: f.image_url,
                    thumbnail: f.thumbnail_url || f.image_url,
                    layout_config: f.layout_config,
                    stats: { style: f.style || 'Custom', vibes: '???' },
                    rarity: f.rarity || 'Common',
                    status: f.status,
                    artist: f.artist || 'PixenzeBooth',
                    sort_order: f.sort_order ?? 999999,
                    is_special: f.allowed_emails && f.allowed_emails.length > 0,
                    theme_id: f.theme_id || 'default',
                    audio_url: f.audio_url || null,
                    animation_type: f.animation_type || 'none',
                    is_exclusive: f.is_exclusive || false
                }));

            const specialUserFrames = formattedDbFrames.filter(f => f.is_special && !f.is_exclusive);
            const exclusivePlacementFrames = formattedDbFrames.filter(f => f.is_exclusive);
            const regularDbFrames = formattedDbFrames.filter(f => !f.is_special);

            let safeCustomFrames = [];
            try {
                const localData = JSON.parse(localStorage.getItem('custom_frames') || '[]');
                if (Array.isArray(localData)) {
                    safeCustomFrames = localData
                        .filter(f => f && f.image && typeof f.image === 'string' && f.image.startsWith('data:image'))
                        .map(f => ({
                            id: f.id,
                            type: 'user_created', // Special type
                            name: f.name || 'My Custom',
                            image: f.image,
                            thumbnail: f.image,
                            layout_config: null,
                            stats: { style: 'DIY', vibes: '∞' },
                            rarity: 'Legendary',
                            status: 'active',
                            artist: 'Me'
                        }));
                }
            } catch (e) {
            }

            const allFrames = [...safeCustomFrames, ...regularDbFrames, ...basicThemes];

            // Extract unique artists (excluding special ones that aren't in allFrames)
            const uniqueArtists = [...new Set(allFrames.map(f => f.artist).filter(Boolean))];
            setArtists(uniqueArtists);
            // Sort Frames by sort_order ascending
            allFrames.sort((a, b) => {
                const orderA = (a.sort_order !== undefined && a.sort_order !== null) ? a.sort_order : 999999;
                const orderB = (b.sort_order !== undefined && b.sort_order !== null) ? b.sort_order : 999999;
                return orderA - orderB;
            });

            // Sort Special Frames by sort_order ascending
            specialUserFrames.sort((a, b) => {
                const orderA = (a.sort_order !== undefined && a.sort_order !== null) ? a.sort_order : 999999;
                const orderB = (b.sort_order !== undefined && b.sort_order !== null) ? b.sort_order : 999999;
                return orderA - orderB;
            });

            setFrames(allFrames);
            setSpecialFrames(specialUserFrames);
            setExclusiveFrames(exclusivePlacementFrames);

            // Set default selection ONLY after data is loaded
            if (exclusivePlacementFrames.length > 0) {
                setSelectedFrame(exclusivePlacementFrames[0]);
                setSelectedLayout('a');
            } else if (specialUserFrames.length > 0) {
                setSelectedFrame(specialUserFrames[0]);
                setSelectedLayout('a');
            } else if (allFrames.length > 0) {
                setSelectedFrame(allFrames[0]);
                setSelectedLayout('a');
            } else {
                setSelectedFrame(basicThemes[0]);
            }

        } catch (error) {
            console.error("Frame loading error:", error);
            showAlert(`Sistem gagal memuat frame database (Silakan cek Console Browser): ${error.message || 'Unknown error'}`, "error");
            setFrames([...basicThemes]);
            setSelectedFrame(basicThemes[0]);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!selectedFrame) return;

        if (selectedFrame.status === 'coming_soon') {
            setShowComingSoon(true);
            return;
        }

        // direct access
        let config = buildFrameConfig();
        navigate('/booth', { state: { preConfig: config } });
    };

    const buildFrameConfig = () => {
        if (selectedFrame.type === 'basic') {
            return { theme: selectedFrame.id, frameImage: null };
        } else {
            const activeLayout = resolveLayoutSlots(selectedFrame.layout_config, selectedLayout);
            const overrideImage = getLayoutImage(selectedFrame.layout_config, selectedLayout);
            const activeImage = overrideImage || selectedFrame.image;
            return {
                theme: 'custom',
                frameImage: activeImage,
                layout_config: activeLayout,
                name: selectedFrame.name
            };
        }
    }

    // Helper to check if current frame has multiple layouts
    const frameHasMultipleLayouts = checkMultipleLayouts(selectedFrame?.layout_config);

    return (
        <div className="h-screen font-nunito flex flex-col overflow-hidden relative bg-game-bg text-game-accent">
            {/* Per-frame particle animation overlay */}
            <AnimationOverlay type={selectedFrame?.animation_type} />
            <Helmet>
                <title>Select Frame | PixenzeBooth</title>
                <meta name="description" content="Choose from dozens of cute, cool, and aesthetic frames for your photos. Mario, Peach, Cyberpunk, and more!" />
                <link rel="canonical" href="https://pixenzebooth.com/select-frame" />
            </Helmet>

            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            <motion.div
                animate={{
                    scale: [1, 1.3, 1],
                    x: [0, 50, 0],
                    y: [0, -30, 0]
                }}
                transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
                className="hidden md:block absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-game-primary/20 blur-[60px] rounded-full pointer-events-none"
            ></motion.div>

            <motion.div
                animate={{
                    scale: [1.2, 1, 1.2],
                    rotate: [0, 180, 360]
                }}
                transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
                className="hidden md:block absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-game-secondary/15 blur-[60px] rounded-full pointer-events-none"
            ></motion.div>

            <div className="relative z-10 pt-4 pb-2 px-4 border-b-4 border-black bg-game-bg-dark/95 shrink-0 flex items-center">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/')}
                    className="w-12 h-12 btn-game-danger rounded-xl flex items-center justify-center shadow-game"
                    title="Back to Home"
                >
                    <ArrowLeft size={24} strokeWidth={3} />
                </motion.button>
                <div className="flex-1 flex justify-center -ml-10">
                    <motion.h1
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="text-2xl sm:text-3xl md:text-4xl font-titan text-game-secondary text-center text-stroke drop-shadow-game-lg"
                    >
                        SELECT YOUR FRAME
                    </motion.h1>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row relative z-10 overflow-hidden min-h-0">

                <div className="md:w-2/5 md:border-r-4 border-black flex flex-col order-2 md:order-1 h-full bg-game-bg-dark/70 min-h-0">
                    <div className="p-2 md:p-3 border-b-4 border-black bg-white/20 shrink-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="font-titan text-xs md:text-base text-game-accent">CATEGORY</h2>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mask-fade-right">
                            <button
                                onClick={() => setSelectedArtist('all')}
                                className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border-2 ${selectedArtist === 'all'
                                    ? 'bg-game-secondary text-black border-black shadow-[2px_2px_0_#000]'
                                    : 'bg-white/40 text-game-accent border-black/10 hover:bg-white/70 hover:text-black'}`}
                            >
                                All Frames
                            </button>
                            {artists.map(artist => (
                                <button
                                    key={artist}
                                    onClick={() => setSelectedArtist(artist)}
                                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-all border-2 ${selectedArtist === artist
                                        ? 'bg-game-primary text-white border-black shadow-[2px_2px_0_#000]'
                                        : 'bg-white/40 text-game-accent border-black/10 hover:bg-white/70 hover:text-black'}`}
                                >
                                    {artist}
                                </button>
                            ))}


                        </div>
                    </div>

                    {availableLetters.length > 0 && (
                        <div className="px-3 pb-2 flex justify-center animate-bounce-slow">
                            <button
                                onClick={() => setActiveLetter(availableLetters[0])}
                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold text-xs shadow-game border-2 border-black flex items-center gap-2 transition-transform hover:scale-105"
                            >
                                <Mail size={16} />
                                READ MESSAGE ({availableLetters.length})
                            </button>
                        </div>
                    )}

                    <div
                        className="flex-1 overflow-y-auto p-3 md:p-4 min-h-0 pb-24 md:pb-4 scroll-smooth flex flex-col gap-4"
                    >
                        {/* 💖 SPESIAL UNTUKMU SECTION 💖 */}
                        {!loading && specialFrames.length > 0 && (
                            <div className="bg-pink-100/90 backdrop-blur-sm border-4 border-pink-400 rounded-2xl p-4 relative overflow-hidden shadow-[0_8px_30px_rgb(236,72,153,0.3)] shrink-0">
                                {/* Cute background decorations */}
                                <div className="absolute top-2 right-2 opacity-50"><Heart size={24} className="text-pink-400 fill-pink-400 animate-pulse" /></div>
                                <div className="absolute bottom-2 left-2 opacity-50"><Heart size={16} className="text-pink-400 fill-pink-400 animate-bounce" /></div>

                                <h3 className="font-titan text-pink-600 text-sm md:text-base text-center mb-3 flex items-center justify-center gap-2 drop-shadow-sm">
                                    <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                                    SPESIAL UNTUKMU
                                    <Sparkles size={16} className="text-yellow-500 animate-pulse" />
                                </h3>

                                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x relative z-10 w-full justify-center md:justify-start">
                                    {specialFrames.map(fighter => (
                                        <button
                                            key={fighter.id}
                                            onClick={() => setSelectedFrame(fighter)}
                                            className={`flex-shrink-0 aspect-square w-24 md:w-28 rounded-xl border-2 overflow-hidden relative transition-all duration-300 active:scale-95 snap-center ${selectedFrame?.id === fighter.id
                                                ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)] scale-105 z-10 ring-2 ring-white'
                                                : 'border-white hover:border-pink-400 hover:scale-105 shadow-md'
                                                }`}
                                        >
                                            <img
                                                src={getOptimizedUrl(fighter.thumbnail || fighter.image, 300)}
                                                alt={fighter.name}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                loading="lazy"
                                                decoding="async"
                                            />
                                            {checkMultipleLayouts(fighter.layout_config) && (
                                                <div className="absolute top-1 right-1 bg-pink-500/80 text-[8px] font-bold px-1.5 py-0.5 rounded text-white border border-white/50 z-10 backdrop-blur-sm">
                                                    A/B
                                                </div>
                                            )}
                                            {selectedFrame?.id === fighter.id && (
                                                <div className="absolute inset-0 border-4 border-pink-500 rounded-xl"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 content-start">
                            {loading ? (
                                <div className="col-span-full h-40 flex flex-col items-center justify-center text-game-accent/50 animate-pulse">
                                    <div className="w-12 h-12 border-4 border-game-secondary border-t-transparent rounded-full animate-spin mb-4"></div>
                                    <span className="font-bold font-mono">LOADING FIGHTERS...</span>
                                </div>
                            ) : (
                                <>
                                    {filteredFrames
                                        .slice(0, visibleLimit)
                                        .map((fighter) => (
                                            <button
                                                key={fighter.id}
                                                onClick={() => setSelectedFrame(fighter)}
                                                className={`aspect-square rounded-xl border-2 overflow-hidden relative transition-transform duration-150 active:scale-95 group ${selectedFrame?.id === fighter.id
                                                    ? 'border-game-secondary shadow-[0_0_15px_rgba(250,206,16,0.5)] scale-105 z-10'
                                                    : 'border-black hover:border-game-primary/50 hover:scale-105'
                                                    } ${fighter.status === 'coming_soon' ? 'opacity-60' : ''}`}
                                            >
                                                <div className={`absolute inset-0 ${fighter.type === 'basic' ? fighter.color : 'bg-gradient-to-br from-game-bg-dark to-game-bg'}`}></div>

                                                {fighter.type === 'basic' ? (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <Star size={20} className="text-white drop-shadow-md md:hidden" fill="currentColor" />
                                                        <Star size={24} className="text-white drop-shadow-md hidden md:block" fill="currentColor" />
                                                    </div>
                                                ) : (
                                                    <img
                                                        src={getOptimizedUrl(fighter.thumbnail || fighter.image, 300)}
                                                        alt={fighter.name}
                                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                )}

                                                {checkMultipleLayouts(fighter.layout_config) && (
                                                    <div className="absolute top-1 right-1 bg-black/60 text-[8px] font-bold px-1.5 py-0.5 rounded text-white border border-white/20 z-10">
                                                        A/B
                                                    </div>
                                                )}

                                                {fighter.status === 'coming_soon' && (
                                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                        <Lock size={16} className="text-game-secondary" />
                                                    </div>
                                                )}

                                                {selectedFrame?.id === fighter.id && (
                                                    <div className="absolute inset-0 border-4 border-game-secondary rounded-xl"></div>
                                                )}
                                            </button>
                                        ))}
                                    {/* Infinite Scroll Sentinel */}
                                    <div ref={observerTarget} className="col-span-full h-10 w-full" />
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <div className="md:w-3/5 flex flex-col p-4 md:p-6 lg:p-8 order-1 md:order-2 shrink-0 md:h-full overflow-hidden bg-white/5 md:bg-transparent border-b-4 md:border-b-0 border-black shadow-lg md:shadow-none relative z-20">

                    <div className="mb-2 md:mb-4 shrink-0 flex justify-center md:justify-start">
                        {selectedFrame ? (
                            <motion.div
                                key={selectedFrame.id}
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-gradient-to-r from-game-secondary to-game-primary px-4 py-1.5 md:px-6 md:py-2 -skew-x-12 inline-block border-2 md:border-4 border-black shadow-game"
                            >
                                <h2 className="font-titan text-lg md:text-3xl lg:text-4xl text-white skew-x-12 tracking-wider drop-shadow-md text-center">
                                    {selectedFrame.name}
                                </h2>
                            </motion.div>
                        ) : (
                            <div className="h-10 w-48 bg-black/10 rounded animate-pulse"></div>
                        )}
                    </div>

                    <div className="flex-1 flex items-center justify-center md:mb-4 min-h-0 relative max-h-[25vh] md:max-h-full">
                        {loading || !selectedFrame ? (
                            <div className="flex flex-col items-center justify-center text-game-accent/50 space-y-4">
                                <div className="w-12 h-12 md:w-20 md:h-20 border-4 border-black/20 border-t-game-secondary rounded-full animate-spin"></div>
                                <p className="font-titan text-sm md:text-xl animate-pulse">LOADING...</p>
                            </div>
                        ) : (
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedFrame.id}
                                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.9, opacity: 0, y: -20 }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                                    className={`relative max-h-full max-w-full h-full flex items-center justify-center ${selectedFrame.type === 'basic' ? 'aspect-[3/4] w-32 md:w-64' : ''}`}
                                >
                                    {selectedFrame.type === 'basic' ? (
                                        <div className={`w-full h-full rounded-2xl border-4 border-black shadow-game ${selectedFrame.color} flex items-center justify-center`}>
                                            <Star size={40} className="text-white drop-shadow-lg md:hidden" fill="currentColor" />
                                            <Star size={80} className="text-white drop-shadow-lg hidden md:block" fill="currentColor" />
                                        </div>
                                    ) : (
                                        <img
                                            src={
                                                (getLayoutImage(selectedFrame.layout_config, selectedLayout))
                                                    ? getLayoutImage(selectedFrame.layout_config, selectedLayout)
                                                    : selectedFrame.image
                                            }
                                            alt={selectedFrame.name}
                                            className="h-full w-full max-w-[80%] md:max-w-full object-contain drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)]"
                                        />
                                    )}

                                    <motion.div
                                        initial={{ x: 20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                        className="hidden md:flex absolute -right-4 top-10 flex-col gap-2"
                                    >
                                        <div className="bg-black/80 px-3 py-1 rounded border-2 border-game-secondary shadow-lg">
                                            <p className="text-game-secondary font-mono text-[10px] leading-tight flex items-center gap-1">
                                                <Zap className="text-game-secondary" size={16} />RARITY
                                            </p>
                                            <p className="text-white font-titan text-sm">{selectedFrame.rarity}</p>
                                        </div>
                                        <div className="bg-black/80 px-3 py-1 rounded border-2 border-game-primary shadow-lg">
                                            <p className="text-game-primary font-mono text-[10px] leading-tight">STYLE</p>
                                            <p className="text-white font-titan text-sm">{selectedFrame.stats.style}</p>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            </AnimatePresence>
                        )}
                    </div>

                    {frameHasMultipleLayouts && (
                        <div className="w-full flex justify-center z-30 mt-4 md:mt-0 relative md:absolute md:bottom-28 md:left-0 md:right-0">
                            <div className="bg-black/80 backdrop-blur-md p-1.5 rounded-full border-2 border-white/20 flex gap-2 shadow-lg">
                                <button
                                    onClick={() => setSelectedLayout('a')}
                                    className={`px-4 py-2 md:py-1.5 rounded-full font-bold text-xs md:text-sm transition-all border-2 ${selectedLayout === 'a'
                                        ? 'bg-game-primary text-white border-black shadow-sm scale-105'
                                        : 'bg-transparent text-white/50 border-transparent hover:text-white'
                                        }`}
                                >
                                    LAYOUT A
                                </button>
                                <button
                                    onClick={() => setSelectedLayout('b')}
                                    className={`px-4 py-2 md:py-1.5 rounded-full font-bold text-xs md:text-sm transition-all border-2 ${selectedLayout === 'b'
                                        ? 'bg-game-secondary text-black border-black shadow-sm scale-105'
                                        : 'bg-transparent text-white/50 border-transparent hover:text-white'
                                        }`}
                                >
                                    LAYOUT B
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="fixed bottom-4 left-4 right-4 z-50 md:static md:mt-auto md:pt-4">
                        <motion.button
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleConfirm}
                            disabled={loading || !selectedFrame}
                            className="w-full btn-game-primary py-3 md:py-4 text-lg md:text-2xl font-titan relative overflow-hidden group disabled:opacity-50 disabled:grayscale shadow-[0_0_20px_rgba(0,0,0,0.5)] md:shadow-game"
                        >
                            <motion.div
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="hidden md:block absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                            ></motion.div>
                            <span className="relative z-10 text-stroke-sm text-white drop-shadow-lg flex items-center justify-center gap-2">
                                <span>SELECT THIS FRAME</span>
                                <ArrowRight size={20} className="md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
                            </span>
                        </motion.button>
                    </div>
                </div>
            </div>

            <React.Suspense fallback={null}>
                <ComingSoonModal
                    isOpen={showComingSoon}
                    onClose={() => setShowComingSoon(false)}
                />
            </React.Suspense>

            <LetterPopup
                letter={activeLetter}
                onClose={handleCloseLetter}
            />

            <ExclusivePopup
                exclusiveFrames={exclusiveFrames}
                onSelectFrame={(frame) => {
                    setSelectedFrame(frame);
                    // Langsung dibawa ke kamera dengan config frame ini
                    let config = {
                        theme: 'custom',
                        frameImage: getLayoutImage(frame.layout_config, 'a') || frame.image_url || frame.image,
                        layout_config: resolveLayoutSlots(frame.layout_config, 'a'),
                        name: frame.name
                    };
                    navigate('/booth', { state: { preConfig: config } });
                }}
            />

        </div>
    );
};

export default FrameSelection;
