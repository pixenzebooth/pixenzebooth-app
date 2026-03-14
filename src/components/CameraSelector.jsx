import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, ChevronDown, Check, Monitor } from 'lucide-react';

const CameraSelector = ({ devices, selectedDeviceId, onSelectDevice, isOpen, onToggle }) => {
    if (!devices || devices.length <= 1) return null;

    return (
        <div className="relative">
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onToggle}
                className="flex items-center gap-2 bg-black/60 backdrop-blur-sm text-white px-3 py-2 rounded-xl border border-white/20 text-sm font-mono hover:border-[#face10] transition-colors"
            >
                <Camera className="w-4 h-4" />
                <span className="max-w-[150px] truncate">
                    {selectedDeviceId
                        ? devices.find(d => d.deviceId === selectedDeviceId)?.label || 'Camera'
                        : 'Select Camera'}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 mt-2 w-72 bg-[#1a0938]/95 backdrop-blur-xl border-2 border-[#face10]/30 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
                            {devices.map((device, idx) => (
                                <button
                                    key={device.deviceId}
                                    onClick={() => {
                                        onSelectDevice(device.deviceId);
                                        onToggle();
                                    }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selectedDeviceId === device.deviceId
                                            ? 'bg-[#face10]/20 text-[#face10]'
                                            : 'text-white/80 hover:bg-white/10'
                                        }`}
                                >
                                    <Monitor className="w-4 h-4 shrink-0" />
                                    <span className="flex-1 text-sm font-mono truncate">
                                        {device.label || `Camera ${idx + 1}`}
                                    </span>
                                    {selectedDeviceId === device.deviceId && (
                                        <Check className="w-4 h-4 text-[#face10] shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CameraSelector;
