import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, Shield, AlertCircle, CheckCircle2, Loader2, Crown } from 'lucide-react';
import { useLicense } from '../context/LicenseContext';
import { formatLicenseExpiry } from '../services/licenseService';

const LicenseLogin = () => {
    const { activateLicense, isValidating, error } = useLicense();
    const [key, setKey] = useState('');
    const [success, setSuccess] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!key.trim()) return;

        const result = await activateLicense(key);
        if (result.valid) {
            setSuccess(result.license);
        }
    };

    return (
        <div className="h-dvh font-nunito flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background decorations */}
            <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                    backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)',
                    backgroundSize: '30px 30px',
                }}
            />

            <motion.div
                animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, -30, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
                className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#1a3dbf]/20 blob-optimized rounded-full pointer-events-none"
            />

            <motion.div
                animate={{ scale: [1.2, 1, 1.2], x: [0, -40, 0], y: [0, 40, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut' }}
                className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[#ba1c16]/15 blob-optimized rounded-full pointer-events-none"
            />

            {/* Main card */}
            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="relative z-10 w-full max-w-md px-4"
            >
                <div className="bg-[#1a0938]/90 backdrop-blur-xl border-4 border-[#face10] rounded-3xl p-8 shadow-[8px_8px_0_rgba(0,0,0,0.5)] relative overflow-hidden">
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {/* Icon */}
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                        className="flex justify-center mb-6"
                    >
                        <div className="bg-gradient-to-br from-[#face10] to-[#f5a623] p-4 rounded-2xl border-4 border-black shadow-[4px_4px_0_#000]">
                            <Shield className="w-10 h-10 text-black" />
                        </div>
                    </motion.div>

                    {/* Title */}
                    <motion.h1
                        animate={{ rotate: [-1, 1, -1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                        className="text-3xl font-titan text-[#face10] text-center text-stroke drop-shadow-game-lg mb-2"
                    >
                        LICENSE KEY
                    </motion.h1>

                    <p className="text-white/60 font-mono text-xs text-center mb-6 tracking-wider">
                        ENTER YOUR LICENSE TO UNLOCK
                    </p>

                    {success ? (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                            className="text-center space-y-4"
                        >
                            <div className="flex justify-center">
                                <CheckCircle2 className="w-16 h-16 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-titan text-green-400">ACTIVATED!</h2>
                            <div className="bg-black/40 rounded-xl p-4 border border-white/10 space-y-2">
                                <p className="text-white font-mono text-sm">
                                    <span className="text-white/50">Owner:</span> {success.owner_name}
                                </p>
                                <p className="text-white font-mono text-sm flex items-center gap-2 justify-center">
                                    <Crown className="w-4 h-4 text-[#face10]" />
                                    <span className="text-[#face10] uppercase font-bold">{success.plan}</span>
                                </p>
                                <p className="text-white/70 font-mono text-xs">
                                    {formatLicenseExpiry(success.expires_at)}
                                </p>
                            </div>
                            <motion.div
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="text-green-400 font-mono text-sm"
                            >
                                Loading app...
                            </motion.div>
                        </motion.div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* License key input */}
                            <div className="relative">
                                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                                <input
                                    type="text"
                                    value={key}
                                    onChange={(e) => setKey(e.target.value.toUpperCase())}
                                    placeholder="XXXX-XXXX-XXXX-XXXX"
                                    className="w-full bg-black/50 border-2 border-white/20 rounded-xl px-12 py-4 text-white font-mono text-center text-lg tracking-[0.2em] placeholder:text-white/20 focus:outline-none focus:border-[#face10] transition-colors"
                                    disabled={isValidating}
                                    autoFocus
                                />
                            </div>

                            {/* Error message */}
                            {error && (
                                <motion.div
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex items-center gap-2 text-red-400 font-mono text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2"
                                >
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}

                            {/* Submit button */}
                            <motion.button
                                type="submit"
                                disabled={isValidating || !key.trim()}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                className="w-full bg-gradient-to-r from-[#face10] to-[#f5a623] text-black font-titan text-xl py-4 rounded-xl border-4 border-black shadow-[4px_4px_0_#000] hover:shadow-[2px_2px_0_#000] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {isValidating ? (
                                    <>
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                        VALIDATING...
                                    </>
                                ) : (
                                    <>
                                        <Shield className="w-6 h-6" />
                                        ACTIVATE
                                    </>
                                )}
                            </motion.button>
                        </form>
                    )}

                    {/* Footer */}
                    <p className="text-white/30 font-mono text-[10px] text-center mt-6 tracking-widest">
                        GASKENN PHOTOBOOTH • LICENSED SOFTWARE
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default LicenseLogin;
