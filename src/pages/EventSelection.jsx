import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Loader2, ArrowRight, Settings } from 'lucide-react';
import { useEvent } from '../context/EventContext';
import { useTenant } from '../context/TenantContext';

const EventSelection = () => {
    const { availableEvents, isLoading, fetchEvents, selectEvent, activeEventId } = useEvent();
    const { tenantName, hasTenant } = useTenant();

    useEffect(() => {
        if (hasTenant) {
            fetchEvents();
        }
    }, [hasTenant]);

    return (
        <div className="h-dvh font-nunito flex flex-col items-center justify-center relative overflow-hidden bg-[#0f172a]">
            {/* Background decorations */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '30px 30px' }} />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-2xl px-4"
            >
                <div className="bg-[#1e293b]/90 backdrop-blur-xl border-4 border-blue-500/30 rounded-3xl p-8 shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-titan text-white mb-2 tracking-wide">SELECT EVENT</h1>
                            <p className="text-blue-400 font-mono text-sm uppercase tracking-widest">{tenantName}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center border-2 border-white/20 shadow-lg">
                            <Calendar className="text-white" size={24} />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex flex-col items-center py-20 gap-4">
                            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                            <p className="text-white/60 font-mono text-sm">FETCHING EVENTS...</p>
                        </div>
                    ) : availableEvents.length === 0 ? (
                        <div className="text-center py-16 bg-black/20 rounded-2xl border-2 border-dashed border-white/10">
                            <p className="text-white/60 mb-6 px-10">No events found. Please create an event in the Admin Panel (dash.pixenzebooth.com) first.</p>
                            <a
                                href="https://dash.pixenzebooth.com"
                                target="_blank"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition shadow-lg"
                            >
                                <Settings size={18} /> GO TO ADMIN PANEL
                            </a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {availableEvents.map((event) => (
                                <motion.button
                                    key={event.id}
                                    whileHover={{ scale: 1.02, x: 5 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => selectEvent(event)}
                                    className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-4 ${activeEventId === event.id
                                            ? 'bg-blue-600/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-white truncate">{event.event_name}</h3>
                                        <p className="text-xs text-white/40 font-mono mt-1">SLUG: /{event.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {activeEventId === event.id ? (
                                            <CheckCircle2 className="text-blue-400" size={24} />
                                        ) : (
                                            <ArrowRight className="text-white/20" size={24} />
                                        )}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center text-xs font-mono text-white/30 tracking-widest">
                        <span>SELECT ONE TO START BOOTH</span>
                        <span>{availableEvents.length} TOTAL EVENTS</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EventSelection;
