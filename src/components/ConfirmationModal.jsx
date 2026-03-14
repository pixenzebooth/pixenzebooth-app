import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title = "ARE YOU SURE?", message }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
                        animate={{ scale: 1, opacity: 1, rotate: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-[#FF2A2A] border-4 border-black p-0 rounded-2xl max-w-sm w-full shadow-[8px_8px_0_#000] relative overflow-hidden"
                    >
                        {/* Header Bar */}
                        <div className="bg-black/10 p-2 flex justify-end">
                            <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 flex flex-col items-center text-center gap-4">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', bounce: 0.5, delay: 0.1 }}
                            >
                                <AlertTriangle size={48} className="text-white" />
                            </motion.div>

                            <div>
                                <h3 className="font-titan text-2xl uppercase tracking-wider mb-2 text-white">
                                    {title}
                                </h3>
                                <p className="font-mono text-sm leading-relaxed text-white/90">
                                    {message || "Unsaved progress will be lost!"}
                                </p>
                            </div>

                            <div className="flex gap-3 w-full mt-2">
                                <button
                                    onClick={onClose}
                                    className="flex-1 font-titan px-4 py-3 rounded-xl bg-black/20 text-white border-2 border-transparent hover:bg-black/40 hover:border-white/50 transition-all"
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className="flex-1 font-titan px-4 py-3 rounded-xl bg-black text-white border-2 border-transparent hover:bg-white hover:text-black hover:border-black shadow-game hover:translate-y-[-2px] transition-all"
                                >
                                    CONFIRM
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationModal;
