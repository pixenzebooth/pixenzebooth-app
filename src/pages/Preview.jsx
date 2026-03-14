import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Zap, Star, ShieldCheck } from 'lucide-react';
import FilterCarousel from '../components/booth/FilterCarousel';
import { supabase } from '../lib/supabase';
import { getFilterCss } from '../utils/imageUtils';
import { applyLutToImage } from '../utils/lutUtils';

import FilteredImage from '../components/FilteredImage';

const Preview = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    
    const [selectedFilter, setSelectedFilter] = useState('none');
    const [lutFilters, setLutFilters] = useState([]);
    const [builtinFilters] = useState([
        { id: 'none', label: 'NORMAL', icon: '✨', color: 'bg-white text-black' },
        { id: 'bright', label: 'BRIGHT', icon: '☀️', color: 'bg-yellow-100 text-yellow-800' },
        { id: 'soft', label: 'SOFT', icon: '🌸', color: 'bg-pink-100 text-pink-800' },
        { id: 'vintage', label: 'RETRO', icon: '📼', color: 'bg-orange-100 text-orange-800' },
        { id: 'bw', label: 'MONO', icon: '⚫', color: 'bg-gray-200 text-gray-800' },
    ]);

    // Fetch LUTs
    useEffect(() => {
        const fetchLuts = async () => {
            try {
                if (!supabase) return;
                console.log("Fetching LUTs from Supabase...");
                const { data, error: fetchError } = await supabase
                    .from('luts')
                    .select();

                if (fetchError) {
                    console.error("Supabase LUTs fetch error [400?]:", fetchError);
                    return;
                }

                if (data) {
                    console.log(`Successfully fetched ${data.length} LUTs`);
                    const activeLuts = data.filter(l => l.is_active !== false);
                    const dataWithUrls = activeLuts.map(lut => {
                        const path = lut.storage_path || lut.lut_url;
                        if (path && path.startsWith('http')) {
                            return { ...lut, public_url: path };
                        }
                        try {
                            const { data: urlData } = supabase.storage
                                .from('luts')
                                .getPublicUrl(path);
                            return { ...lut, public_url: urlData.publicUrl };
                        } catch (err) {
                            console.warn("Generating public URL failed for", lut.name, err);
                            return { ...lut, public_url: path };
                        }
                    });
                    setLutFilters(dataWithUrls);
                }
            } catch (e) {
                console.error("Critical error in fetchLuts:", e);
            }
        };

        fetchLuts();
    }, []);

    const allFilters = [
        ...builtinFilters,
        ...lutFilters.map(l => ({
            id: l.id,
            label: l.name.toUpperCase(),
            icon: '🎨',
            color: 'bg-purple-100 text-purple-900',
            storage_path: l.public_url || l.storage_path,
            is_lut: true
        }))
    ];

    if (!state?.photos || !state?.config) {
        useEffect(() => { 
            console.warn("Preview accessed without photos or config. Redirecting...");
            navigate('/'); 
        }, [state, navigate]);
        return null;
    }

    const handleConfirm = () => {
        const filterObj = allFilters.find(f => f.id === selectedFilter);
        const finalConfig = { 
            ...state.config, 
            filter: selectedFilter,
            is_lut: filterObj?.is_lut || false,
            lutUrl: filterObj?.storage_path || null
        };
        navigate('/result', { 
            state: { 
                photos: state.photos, 
                config: finalConfig, 
                liveVideos: state.liveVideos 
            } 
        });
    };

    return (
        <div className="min-h-screen bg-white font-nunito flex flex-col overflow-hidden relative select-none">
            {/* Decorations */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
            
            {/* Header */}
            <header className="flex-none h-20 px-6 flex items-center justify-between z-30 relative border-b-4 border-black bg-white">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('/booth')}
                    className="w-12 h-12 btn-game-danger rounded-xl flex items-center justify-center shadow-game"
                >
                    <ArrowLeft size={24} strokeWidth={3} />
                </motion.button>
                
                <h1 className="font-titan text-game-primary text-2xl tracking-widest drop-shadow-sm text-stroke-sm uppercase italic">
                    Review Your Stats
                </h1>

                <div className="w-12"></div> {/* Spacer */}
            </header>

            {/* Main Preview */}
            <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-y-auto">
                <div className="w-full max-w-5xl flex flex-col gap-8">
                    
                    {/* Photos Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 justify-items-center">
                        {state.photos.map((photo, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9, rotate: i % 2 === 0 ? -2 : 2 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="relative bg-black rounded-2xl border-4 border-black shadow-game overflow-hidden aspect-[4/3] w-full max-w-sm group"
                            >
                                <FilteredImage 
                                    src={photo}
                                    filter={allFilters.find(f => f.id === selectedFilter)}
                                />
                                <div className="absolute top-3 right-3 bg-game-primary/90 text-white font-titan px-3 py-1 rounded-full text-xs border-2 border-black shadow-sm">
                                    SHOT {i + 1}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Filter Section */}
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-game-surface border-4 border-black p-6 rounded-[2.5rem] shadow-game-lg relative overflow-hidden"
                    >
                        {/* Decorative Icons */}
                        <div className="absolute top-4 right-6 opacity-10">
                            <ShieldCheck size={64} className="text-game-primary" />
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-6">
                            <div className="flex-none text-center md:text-left">
                                <div className="flex items-center gap-2 mb-1 justify-center md:justify-start">
                                    <Zap size={20} className="text-game-primary" fill="currentColor" />
                                    <span className="font-titan text-game-primary tracking-widest text-sm uppercase">Upgrade Filter</span>
                                </div>
                                <h3 className="font-titan text-2xl text-black">SELECT POWER-UP</h3>
                                <p className="text-gray-500 text-xs font-bold font-mono mt-1">APPLY TO ALL PHOTOS</p>
                            </div>

                            <div className="flex-1 w-full min-w-0">
                                <FilterCarousel 
                                    allFilters={allFilters}
                                    activeFilter={selectedFilter}
                                    onSelectFilter={setSelectedFilter}
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </main>

            {/* Footer Actions */}
            <footer className="flex-none p-6 md:p-8 bg-white border-t-4 border-black flex justify-center z-30">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleConfirm}
                    className="h-16 md:h-20 px-12 md:px-24 btn-game-primary border-4 border-black rounded-2xl flex items-center justify-center gap-4 shadow-game text-white group"
                >
                    <span className="font-titan text-xl md:text-2xl tracking-wider uppercase">Confirm & Continue</span>
                    <ArrowRight size={28} className="group-hover:translate-x-2 transition-transform" strokeWidth={3} />
                </motion.button>
            </footer>

            {/* Background floating elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <motion.div 
                    animate={{ y: [0, -20, 0], rotate: [0, 360] }}
                    transition={{ repeat: Infinity, duration: 20 }}
                    className="absolute top-[20%] right-[10%] opacity-10"
                >
                    <Star size={120} className="text-game-accent" fill="currentColor" />
                </motion.div>
                <motion.div 
                    animate={{ y: [0, 20, 0], x: [0, 20, 0] }}
                    transition={{ repeat: Infinity, duration: 15 }}
                    className="absolute bottom-[20%] left-[5%] opacity-10"
                >
                    <Zap size={100} className="text-game-primary" fill="currentColor" />
                </motion.div>
            </div>
        </div>
    );
};

export default Preview;
