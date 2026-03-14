import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const DownloadOptionsModal = ({ isOpen, onClose, onDownloadJpg, onDownloadVideo, onDownloadGif, isGenerating }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/95">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-white border-[6px] border-black p-6 rounded-3xl max-w-sm w-full relative shadow-[8px_8px_0_#000] text-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-black/50 hover:text-black transition-transform"
                            aria-label="Close Download Options"
                        >
                            <X size={24} strokeWidth={3} />
                        </button>

                        <h3 className="font-titan text-2xl text-black mb-6">CHOOSE FORMAT</h3>

                        <div className="flex flex-col gap-4">
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onDownloadJpg}
                                className="w-full py-3 btn-game-primary text-white font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2"
                            >
                                GET PHOTO (JPG)
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onDownloadVideo}
                                disabled={isGenerating}
                                className="w-full py-3 btn-game-secondary text-black font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <span className="animate-pulse">GENERATING...</span>
                                ) : (
                                    "GET VIDEO (MP4)"
                                )}
                            </motion.button>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onDownloadGif}
                                disabled={isGenerating}
                                className="w-full py-3 bg-game-accent text-black font-titan text-lg shadow-game rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                GET GIF (ANIMATED)
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default DownloadOptionsModal;
