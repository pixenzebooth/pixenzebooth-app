import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const QRModal = ({ isOpen, onClose, qrUrl }) => {
    return (
        <AnimatePresence>
            {isOpen && qrUrl && (
                <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/95">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-white border-[6px] border-black p-8 rounded-3xl max-w-sm w-full relative shadow-[8px_8px_0_#000] text-center"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-black/50 hover:text-black transition-transform"
                            aria-label="Close QR"
                        >
                            <X size={32} strokeWidth={3} />
                        </button>

                        <h3 className="font-titan text-3xl text-black mb-2">SCAN ME!</h3>
                        <p className="text-black/60 font-mono text-sm mb-6">Scan ini dengan kamera HP kamu untuk men-download hasil!</p>

                        <div className="bg-white p-4 inline-block border-4 border-black rounded-2xl mx-auto shadow-sm">
                            <QRCodeCanvas value={qrUrl} size={200} className="mx-auto" />
                        </div>

                        <p className="text-black/40 text-[10px] font-mono mt-6 break-all line-clamp-2">{qrUrl}</p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default QRModal;
