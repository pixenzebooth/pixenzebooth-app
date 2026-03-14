import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Sparkles, QrCode, CheckCircle2, User } from 'lucide-react';
import { useAlert } from '../context/AlertContext';

const PaymentModal = ({ isOpen, onClose, onSuccess, amount }) => {
    const [step, setStep] = useState(2); // Start directly at step 2 (QR phase)
    const [isProcessing, setIsProcessing] = useState(false);
    const [qrUrl, setQrUrl] = useState(null);
    const [orderId, setOrderId] = useState(null);
    const { showAlert } = useAlert();

    const handleGenerateQR = async () => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/midtrans-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount,
                    orderId: `PX-${Date.now()}`,
                    name: "Pixenzebooth Guest",
                    email: "guest@pixenzebooth.com"
                })
            });
            const data = await res.json();

            if (data.success && data.qr_url) {
                setQrUrl(data.qr_url);
                setOrderId(data.order_id);
                setStep(2);
            } else {
                throw new Error(data.message || 'Failed to generate QR');
            }
        } catch (err) {
            showAlert('Error: ' + err.message, 'error');
            // Allow them to retry or close
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            setStep(2);
            setQrUrl(null);
            setOrderId(null);
            handleGenerateQR(); // Auto generate QR when opened
        }
    }, [isOpen]);

    useEffect(() => {
        let interval;
        if (step === 2 && orderId) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/midtrans-status?order_id=${orderId}`);
                    const data = await res.json();
                    if (data.success && (data.transaction_status === 'settlement' || data.transaction_status === 'capture')) {
                        clearInterval(interval);
                        setStep(3);
                        setTimeout(() => {
                            onSuccess();
                        }, 2000);
                    }
                } catch (e) {
                    console.error("Polling error", e);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [step, orderId, onSuccess]);


    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => {
                            if (step !== 3) onClose();
                        }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md bg-game-surface border-4 border-black rounded-2xl shadow-game p-6 md:p-8 overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 w-full h-2 bg-game-primary"></div>

                        {step !== 3 && (
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="absolute top-4 right-4 p-2 text-black/50 hover:text-black hover:bg-black/5 rounded-xl transition-colors disabled:opacity-50"
                            >
                                <X size={24} />
                            </button>
                        )}


                        {step === 2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="text-center">
                                <h2 className="text-2xl font-titan text-black mb-1 uppercase text-stroke-sm">Scan to Pay</h2>
                                <p className="text-black/70 font-bold mb-6 text-sm">
                                    Total: <span className="text-game-primary text-xl ml-1">Rp {amount.toLocaleString('id-ID')}</span>
                                </p>

                                <div className="bg-white p-4 rounded-xl inline-block border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative group">
                                    <div className="absolute inset-0 bg-blue-500/10 pointer-events-none group-hover:bg-transparent transition-colors"></div>
                                    {qrUrl ? (
                                        <img src={qrUrl} alt="QR Code QRIS" className="w-56 h-56 object-contain" />
                                    ) : (
                                        <div className="w-56 h-56 bg-slate-100 flex items-center justify-center animate-pulse">
                                            <QrCode size={48} className="text-slate-300" />
                                        </div>
                                    )}
                                </div>

                                <p className="mt-3 text-sm font-bold text-black/60 bg-yellow-100 p-2 rounded-lg border border-yellow-300">
                                    Supported by ShopeePay, GoPay, OVO, Dana, LinkAja, and any QRIS scanner.
                                </p>

                                <div className="mt-6 flex flex-col items-center justify-center gap-2 text-game-primary">
                                    <Loader2 className="animate-spin" size={24} />
                                    <p className="font-bold text-sm tracking-wide animate-pulse">Waiting for Payment...</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-6">
                                <div className="w-24 h-24 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 border-4 border-green-500 shadow-game">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", delay: 0.2 }}
                                    >
                                        <CheckCircle2 size={48} />
                                    </motion.div>
                                </div>
                                <h2 className="text-3xl font-titan text-green-600 mb-2 uppercase text-stroke-sm">Success!</h2>
                                <p className="text-black/70 font-bold text-lg">
                                    Payment received. Enjoy your session!
                                </p>
                            </motion.div>
                        )}

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default PaymentModal;
