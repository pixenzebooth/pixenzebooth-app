import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, ChevronDown } from 'lucide-react';

/**
 * Inventory component that displays captured photos.
 * Includes both mobile (drawer) and desktop versions.
 */
const Inventory = ({ config, photos, onRemove, showInventory, onToggleInventory }) => {
    return (
        <>
            {/* DESKTOP VERSION */}
            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="hidden lg:flex flex-col w-[360px] bg-white border-4 border-black rounded-[2rem] p-5 shadow-game h-[min(48.75vw,65vh)] relative"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-titan text-game-primary text-2xl flex items-center gap-3">
                        INVENTORY
                        <span className="bg-game-accent text-black text-sm px-2 py-0.5 rounded-full border-2 border-black">
                            {photos.length}
                        </span>
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 overflow-x-hidden">
                    {config.frameImage && config.layout_config && config.layout_config.length > 0 ? (
                        /* Layout-based Preview (Desktop) */
                        <div className="relative w-full shadow-game bg-gray-50 border-4 border-black">
                            <img src={config.frameImage} className="w-full h-auto relative z-10 pointer-events-none" alt="Frame Layout Preview" />
                            {config.layout_config.map((slot, i) => (
                                <div
                                    key={i}
                                    className="absolute z-0 bg-gray-200 overflow-hidden flex items-center justify-center group"
                                    style={{ 
                                        top: `${slot.y}%`, 
                                        left: `${slot.x}%`, 
                                        width: `${slot.width}%`, 
                                        height: `${slot.height}%` 
                                    }}
                                >
                                    {photos[i] ? (
                                        <>
                                            <img src={photos[i]} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                                            <div className="absolute top-1 left-1 w-5 h-5 bg-game-primary text-white font-black text-[10px] flex items-center justify-center rounded border border-black z-20 pointer-events-none">
                                                {i + 1}
                                            </div>
                                            <button
                                                onClick={() => onRemove(i)}
                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-game-primary z-30 cursor-pointer pointer-events-auto"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </>
                                    ) : (
                                        <span className="font-titan text-gray-400/50 text-xl">{i + 1}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Flat Grid Preview (Desktop) */
                        <div className="grid grid-cols-2 gap-3">
                            {Array.from({ length: config.totalPhotos }).map((_, i) => (
                                <div key={i} className="aspect-square bg-gray-100 rounded-2xl border-4 border-black overflow-hidden relative group">
                                    {photos[i] ? (
                                        <>
                                            <img src={photos[i]} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                                            <button
                                                onClick={() => onRemove(i)}
                                                className="absolute inset-0 bg-game-danger/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                            >
                                                <Trash2 size={24} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center border-4 border-dashed border-gray-300">
                                            <span className="font-titan text-gray-400 text-2xl">{i + 1}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <p className="mt-4 text-[10px] font-mono text-gray-400 italic">
                    * Click Trash to remove photo
                </p>
            </motion.div>

            {/* MOBILE VERSION (DRAWER) */}
            <AnimatePresence>
                {showInventory && (
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-6 z-50 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-titan text-game-primary text-xl">INVENTORY</h3>
                            <button onClick={onToggleInventory} className="p-2 text-game-primary/50">
                                <ChevronDown />
                            </button>
                        </div>
                        <div className="w-full overflow-y-auto max-h-[60vh] flex flex-col items-center custom-scrollbar pb-10">
                            {config.frameImage && config.layout_config && config.layout_config.length > 0 ? (
                                <div className="relative w-full max-w-[85vw] sm:max-w-[380px] shadow-game bg-gray-50 border-4 border-black">
                                    <img src={config.frameImage} className="w-full h-auto relative z-10 pointer-events-none" alt="Frame Layout Preview Mobile" />
                                    {config.layout_config.map((slot, i) => (
                                        <div
                                            key={i}
                                            className="absolute z-0 bg-gray-200 overflow-hidden flex items-center justify-center group"
                                            style={{ top: `${slot.y}%`, left: `${slot.x}%`, width: `${slot.width}%`, height: `${slot.height}%` }}
                                        >
                                            {photos[i] ? (
                                                <>
                                                    <img src={photos[i]} className="w-full h-full object-cover" alt={`Photo ${i + 1}`} />
                                                    <div className="absolute top-1 left-1 w-5 h-5 bg-game-primary text-white font-black text-[10px] flex items-center justify-center rounded border border-black z-20 pointer-events-none">
                                                        {i + 1}
                                                    </div>
                                                    <button
                                                        onClick={() => onRemove(i)}
                                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-game-primary z-30 cursor-pointer pointer-events-auto"
                                                    >
                                                        <Trash2 size={24} />
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="font-titan text-gray-400/50 text-xl">{i + 1}</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full grid grid-cols-4 gap-2">
                                    {Array.from({ length: config.totalPhotos }).map((_, i) => (
                                        <div key={i} className="aspect-square bg-gray-200 rounded-xl border-2 border-black/20 overflow-hidden relative group">
                                            {photos[i] ? (
                                                <>
                                                    <img src={photos[i]} className="w-full h-full object-cover" />
                                                    <button onClick={() => onRemove(i)} className="absolute inset-0 bg-red-500/50 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-gray-400">
                                                    <span className="font-titan text-gray-400">{i + 1}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Inventory;
