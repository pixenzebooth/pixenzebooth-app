import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, AlertTriangle, RefreshCw } from 'lucide-react';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen font-nunito flex flex-col items-center justify-center relative overflow-hidden p-4">

            {/* Background Pattern - similar to Home */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="z-10 text-center flex flex-col items-center max-w-2xl w-full bg-black/20 backdrop-blur-sm p-8 rounded-3xl border-4 border-black shadow-game-lg"
            >
                {/* 404 Glitch Text Effect */}
                <div className="relative mb-6">
                    <motion.h1
                        animate={{
                            x: [0, -4, 4, -2, 0],
                            textShadow: [
                                "4px 4px 0px #FF005C",
                                "-4px -4px 0px #00F0FF",
                                "4px -4px 0px #FFDE00",
                                "4px 4px 0px #FF005C"
                            ]
                        }}
                        transition={{ repeat: Infinity, duration: 2, repeatType: "mirror" }}
                        className="text-8xl md:text-9xl font-titan text-game-accent text-stroke relative z-10"
                    >
                        404
                    </motion.h1>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-6"
                >
                    <div className="bg-game-primary text-white border-4 border-black shadow-game px-6 py-2 rounded-xl transform -rotate-2 inline-block">
                        <h2 className="text-2xl md:text-3xl font-titan uppercase tracking-wide">
                            GAME OVER
                        </h2>
                    </div>

                    <p className="text-xl md:text-2xl text-game-accent font-bold font-titan drop-shadow-md">
                        Level Not Found!
                    </p>

                    <p className="text-base md:text-lg text-game-accent/90 font-mono mb-8 max-w-md mx-auto">
                        It seems you've wandered into a glitched zone. The page you are looking for has been moved, deleted, or never existed to begin with.
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 justify-center items-center w-full">
                        <motion.button
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate('/')}
                            className="w-full md:w-auto btn-game-secondary px-8 py-4 rounded-xl font-titan text-xl flex items-center justify-center gap-3"
                        >
                            <Home size={24} />
                            RETURN TO BASE
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05, y: -4 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => window.location.reload()}
                            className="w-full md:w-auto btn-game-primary px-8 py-4 rounded-xl font-titan text-xl flex items-center justify-center gap-3"
                        >
                            <RefreshCw size={24} />
                            TRY AGAIN
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>

            {/* Decorative Floating Elements */}
            <motion.div
                animate={{
                    y: [0, -30, 0],
                    rotate: [0, 45, 0]
                }}
                transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                className="absolute top-20 left-10 opacity-60 z-0"
            >
                <AlertTriangle size={64} className="text-game-accent" />
            </motion.div>

            <motion.div
                animate={{
                    y: [0, 30, 0],
                    rotate: [0, -45, 0]
                }}
                transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-20 right-10 opacity-60 z-0"
            >
                <AlertTriangle size={80} className="text-game-primary" />
            </motion.div>

        </div>
    );
};

export default NotFound;
