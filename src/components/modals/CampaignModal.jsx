import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, RotateCcw, Star } from 'lucide-react';

const CampaignModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    isLoading, 
    campaignData, 
    setCampaignData 
}) => {
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(e);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="bg-game-primary border-[6px] border-black p-6 md:p-8 rounded-3xl max-w-lg w-full relative shadow-[8px_8px_0_#000] text-center max-h-[90vh] overflow-y-auto scrollbar-hide text-white"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-white/70 hover:text-white hover:scale-110 transition-transform"
                            aria-label="Close Campaign Modal"
                        >
                            <X size={28} strokeWidth={3} />
                        </button>

                        <h2 className="text-3xl md:text-4xl font-titan text-game-secondary mb-2 leading-tight drop-shadow-md text-stroke-sm">
                            CLAIM REWARD
                        </h2>
                        <p className="text-white/90 font-mono text-sm mb-6 border-b-2 border-white/20 pb-4">
                            Congratulations! You are one of the lucky few. Fill in your details to receive your free print.
                        </p>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-left">
                            <div>
                                <label className="block font-bold text-xs mb-1 uppercase tracking-wider text-game-secondary">FULL NAME</label>
                                <input
                                    type="text" required
                                    value={campaignData.name}
                                    onChange={e => setCampaignData({ ...campaignData, name: e.target.value })}
                                    className="w-full border-4 border-black rounded-xl p-3 font-mono focus:outline-none focus:ring-4 focus:ring-game-secondary/50 text-black bg-white placeholder:text-gray-400"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-xs mb-1 uppercase tracking-wider text-game-secondary">WHATSAPP NUMBER</label>
                                <input
                                    type="tel" required
                                    value={campaignData.whatsapp}
                                    onChange={e => setCampaignData({ ...campaignData, whatsapp: e.target.value })}
                                    className="w-full border-4 border-black rounded-xl p-3 font-mono focus:outline-none focus:ring-4 focus:ring-game-secondary/50 text-black bg-white placeholder:text-gray-400"
                                    placeholder="08xxxxxxxx"
                                />
                            </div>
                            <div>
                                <label className="block font-bold text-xs mb-1 uppercase tracking-wider text-game-secondary">SHIPPING ADDRESS</label>
                                <textarea
                                    required
                                    value={campaignData.address}
                                    onChange={e => setCampaignData({ ...campaignData, address: e.target.value })}
                                    className="w-full border-4 border-black rounded-xl p-3 font-mono focus:outline-none focus:ring-4 focus:ring-game-secondary/50 text-black bg-white placeholder:text-gray-400 h-24 resize-none"
                                    placeholder="Full address for delivery..."
                                />
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={isLoading}
                                type="submit"
                                className="mt-4 w-full btn-game-secondary text-lg py-4 rounded-xl flex items-center justify-center gap-2 border-4 border-black shadow-[4px_4px_0_#000] hover:shadow-[6px_6px_0_#000] translate-y-0 hover:-translate-y-1 transition-all !text-black font-bold"
                            >
                                {isLoading ? (
                                    <>
                                        <RotateCcw className="animate-spin" size={24} /> CLAIMING...
                                    </>
                                ) : (
                                    <>
                                        CONFIRM & CLAIM <Star fill="currentColor" size={24} />
                                    </>
                                )}
                            </motion.button>
                        </form>
                        <p className="text-xs text-white/50 mt-4 font-mono">
                            *Limited slots available. First come first serve.
                        </p>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default CampaignModal;
