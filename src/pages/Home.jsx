import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Camera, Palette, Star, Zap } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useEvent } from '../context/EventContext';
import { motion } from 'framer-motion';

import { Helmet } from 'react-helmet-async';
import PaymentModal from '../components/PaymentModal';

const Home = () => {
    const navigate = useNavigate();
    const { setTheme, customLogoUrl, paymentConfig } = useTheme();
    const { activeEvent, selectEvent } = useEvent();
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const handleStartGame = () => {
        if (paymentConfig?.enabled) {
            setShowPaymentModal(true);
        } else {
            navigate('/select-frame');
        }
    };


    useEffect(() => {
        setTheme('reset');
    }, [setTheme]);
    return (
        <div className="h-dvh font-nunito flex flex-col relative overflow-hidden">
            <Helmet>
                <title>PixenzeBooth - Free Online Photobooth</title>
                <meta name="description" content="Click, Snap, Shine! PixenzeBooth is the best free online photobooth with custom frames, filters, and instant downloads. No app installation needed." />
                <meta name="keywords" content="online photobooth, web photobooth, camera filters, custom frames, photo booth app, free photobooth, pixenze" />
                <link rel="canonical" href="https://pixenzebooth.com/" />

                {/* Open Graph */}
                <meta property="og:title" content="PixenzeBooth - Free Online Photobooth" />
                <meta property="og:description" content="Capture your best moments with PixenzeBooth's fun frames and filters!" />
                <meta property="og:url" content="https://pixenzebooth.com/" />
                <meta property="og:type" content="website" />
            </Helmet>









            <motion.div
                animate={{
                    y: [0, -20, 0],
                    rotate: [0, 10, -10, 0]
                }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                className="hidden md:block absolute top-20 left-20"
            >
                <Zap className="w-12 h-12 text-[#face10]" fill="currentColor" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 15, 0],
                    x: [0, 10, 0],
                    rotate: [0, -15, 15, 0]
                }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 0.5 }}
                className="hidden md:block absolute top-32 right-24"
            >
                <Star className="w-10 h-10 text-game-secondary" fill="currentColor" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, -25, 0],
                    rotate: [0, 360]
                }}
                transition={{ repeat: Infinity, duration: 5, ease: "linear" }}
                className="hidden md:block absolute bottom-32 left-32"
            >
                <Zap className="w-10 h-10 text-[#39FF14]" fill="currentColor" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 20, 0],
                    scale: [1, 1.2, 1]
                }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 1 }}
                className="hidden md:block absolute bottom-20 right-40"
            >
                <Zap className="w-9 h-9 text-[#ba1c16]" fill="currentColor" />
            </motion.div>

            <div className="flex-1 flex flex-col items-center justify-center w-full p-3 md:p-6 z-10 min-h-0">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 30 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="text-center flex flex-col items-center w-full max-w-4xl min-h-0"
                >
                    <motion.div
                        animate={{ y: [0, -15, 0] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                        className="relative mb-3 md:mb-8"
                    >
                        {customLogoUrl ? (
                            <motion.img
                                src={customLogoUrl}
                                alt="Photobooth Logo"
                                animate={{ rotate: [-1, 1, -1] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="max-h-32 sm:max-h-40 md:max-h-56 w-auto drop-shadow-game-lg object-contain"
                            />
                        ) : (
                            <>
                                <motion.h1
                                    animate={{ rotate: [-2, -3, -1, -2] }}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                    className="text-4xl sm:text-6xl md:text-9xl font-titan text-game-accent text-stroke drop-shadow-game-lg leading-none"
                                >
                                    PIXENZE
                                </motion.h1>
                                <motion.h1
                                    animate={{ rotate: [2, 3, 1, 2] }}
                                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                                    className="text-4xl sm:text-6xl md:text-9xl font-titan text-game-primary text-stroke drop-shadow-game-lg -mt-1 md:-mt-4 leading-none"
                                >
                                    BOOTH
                                </motion.h1>
                            </>
                        )}

                        <motion.div
                            animate={{
                                rotate: [0, 360],
                                scale: [1, 1.3, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                            className="hidden md:block absolute -top-8 -right-8"
                        >
                            <Star className="w-12 h-12 text-[#face10]" fill="currentColor" />
                        </motion.div>

                        <motion.div
                            animate={{
                                y: [0, -10, 0],
                                scale: [1, 1.5, 1]
                            }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                            className="hidden md:block absolute bottom-4 -left-12"
                        >
                            <Star className="w-8 h-8 text-[#39FF14]" fill="currentColor" />
                        </motion.div>
                    </motion.div>

                    <motion.p
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        className="bg-black/80 text-white font-mono text-xs sm:text-base md:text-xl px-4 sm:px-8 py-1.5 sm:py-2 rounded-full border-2 border-white/20 backdrop-blur-sm mb-4 md:mb-10 shadow-lg tracking-wider"
                    >
                        CAPTURE YOUR MOMENT IN STYLE
                    </motion.p>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="flex justify-center w-full max-w-sm md:max-w-md px-4 mt-4"
                    >
                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            whileHover={{
                                scale: 1.05,
                                rotate: [0, -2, 2, 0],
                                y: -8
                            }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleStartGame}
                            className="group btn-game-primary shadow-game rounded-3xl p-4 md:p-6 flex items-center justify-center gap-4 transition-all relative overflow-hidden w-full"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>

                            <motion.div
                                whileHover={{ rotate: 12, scale: 1.1 }}
                                className="bg-black/20 p-3 md:p-4 rounded-full border-2 border-black/20 relative z-10 hidden sm:block"
                            >
                                <Camera size={28} className="md:w-10 md:h-10" />
                            </motion.div>
                            <span className="text-2xl md:text-3xl font-titan text-stroke-sm text-white drop-shadow-md relative z-10 w-full text-center sm:text-left sm:w-auto">START GAME</span>
                        </motion.button>
                    </motion.div>
                </motion.div>
            </div>

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="w-full py-2 md:py-4 flex flex-col items-center justify-center gap-2 text-game-accent/60 font-bold font-mono text-[10px] md:text-xs tracking-widest z-20 shrink-0"
            >
                <div className="flex gap-4 md:gap-8">
                    <Link to="/about" className="hover:text-game-accent transition-colors">ABOUT</Link>
                    <Link to="/privacy" className="hover:text-game-accent transition-colors">PRIVACY</Link>
                    <Link to="/contact" className="hover:text-game-accent transition-colors">CONTACT</Link>
                    <button
                        onClick={() => selectEvent(null)}
                        className="hover:text-red-400 transition-colors uppercase"
                    >
                        Switch Event ({activeEvent?.event_name})
                    </button>
                </div>
                <p>
                    &copy; {new Date().getFullYear()} PIXENZEBOOTH. ALL RIGHTS RESERVED.
                </p>
            </motion.div>

            <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                onSuccess={() => {
                    setShowPaymentModal(false);
                    navigate('/select-frame');
                }}
                amount={paymentConfig?.amount || 0}
            />
        </div>
    );
};

export default Home;
