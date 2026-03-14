import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ComingSoonModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0.8, rotate: 5 }}
                        className="bg-purple-900 border-4 border-[#FFDE00] p-8 rounded-3xl max-w-md text-center relative shadow-[0_0_50px_rgba(255,222,0,0.5)]"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            onClick={onClose}
                            className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full border-2 border-black hover:scale-110 transition shadow-game"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>

                        <h2 className="text-4xl font-titan text-[#FFDE00] mb-4 text-stroke">COMING SOON!</h2>

                        <div className="bg-white/10 p-4 rounded-xl border border-white/20 mb-6">
                            <p className="text-white font-nunito text-lg leading-relaxed">
                                The Photo Booth is getting a <b>Level Up!</b> 🍄
                                <br /><br />
                                We are currently performing maintenance to bring you new frames and features.
                                <br />
                                <span className="text-gray-400 text-sm">(You can still browse the frame collection!)</span>
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="bg-[#39FF14] text-black font-bold py-3 px-8 rounded-xl border-4 border-black shadow-game active:translate-y-1 active:shadow-none transition hover:-translate-y-1 hover:shadow-game-hover font-titan text-xl"
                        >
                            GOT IT!
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ComingSoonModal;
