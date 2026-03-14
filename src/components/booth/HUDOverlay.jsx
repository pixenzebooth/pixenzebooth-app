import React from 'react';
import { FlipHorizontal2, RefreshCw, ZapOff, Zap } from 'lucide-react';

/**
 * HUD Overlay for the camera preview. 
 * Contains camera controls (mirror, flip, flash, live) and HUD indicators.
 */
const HUDOverlay = ({ config, setConfig, onSwitchCamera, onToggleFlash, flashOn, activeFilterLabel }) => {
    return (
        <div className="absolute inset-0 pointer-events-none p-3 md:p-5 flex flex-col justify-between">
            {/* Top Row: Camera Settings */}
            <div className="flex justify-between items-start pointer-events-auto">
                <div className="bg-[#ff4444] text-white font-mono text-[10px] md:text-xs font-bold px-2 py-0.5 md:px-3 md:py-1 rounded border-2 border-black flex items-center gap-2 animate-pulse shadow-md">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full"></div> REC
                </div>

                <div className="flex gap-2 flex-wrap justify-end max-w-[70%]">
                    <button
                        onClick={() => setConfig(prev => ({ ...prev, isMirrored: !prev.isMirrored }))}
                        className={`px-2 py-0.5 md:py-1 rounded border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                            config.isMirrored
                                ? 'bg-game-primary text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white/80 text-game-primary border-black/20 hover:bg-white'
                        }`}
                        title="Mirror / Flip"
                    >
                        <FlipHorizontal2 size={12} strokeWidth={2.5} />
                        <span className="hidden sm:inline">MIRROR</span>
                    </button>

                    <button
                        onClick={onSwitchCamera}
                        className="px-2 py-0.5 md:py-1 rounded border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm bg-white/80 text-game-primary border-black/20 hover:bg-white"
                        title="Switch Camera"
                    >
                        <RefreshCw size={12} strokeWidth={2.5} />
                        <span className="hidden sm:inline">FLIP</span>
                    </button>

                    <button
                        onClick={onToggleFlash}
                        className={`px-2 py-0.5 md:py-1 rounded border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                            flashOn
                                ? 'bg-yellow-400 text-black border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white/80 text-game-primary border-black/20 hover:bg-white'
                        }`}
                        title="Toggle Flash"
                    >
                        {flashOn ? <ZapOff size={12} strokeWidth={2.5} /> : <Zap size={12} strokeWidth={2.5} />}
                        <span className="hidden sm:inline">FLASH</span>
                    </button>

                    <button
                        onClick={() => setConfig(prev => ({ ...prev, isLive: !prev.isLive }))}
                        className={`px-2 py-0.5 md:py-1 rounded border-2 font-mono text-[10px] md:text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm ${
                            config.isLive
                                ? 'bg-game-primary text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                                : 'bg-white/80 text-game-primary border-black/20 hover:bg-white'
                        }`}
                    >
                        <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${config.isLive ? 'border-white' : 'border-game-primary'}`}>
                            <div className={`w-1 h-1 rounded-full ${config.isLive ? 'bg-white' : 'bg-game-primary'}`}></div>
                        </div>
                        <span className="hidden sm:inline">LIVE</span>
                    </button>

                </div>
            </div>

            {/* Center Target: Pure visual element */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40">
                <div className="w-12 h-12 md:w-16 md:h-16 border-2 border-game-primary rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-game-primary rounded-full"></div>
                </div>
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-game-primary"></div>
                <div className="absolute top-0 left-1/2 h-full w-[1px] bg-game-primary"></div>
            </div>

            {/* Bottom Row: HUD Telemetry */}
            <div className="flex justify-between items-end">
                <div className="bg-white/80 backdrop-blur px-2 py-0.5 md:py-1 rounded text-[10px] font-mono text-game-primary border border-game-primary/20">
                    ISO 800
                </div>
                <div className="bg-white/80 backdrop-blur px-2 py-0.5 md:py-1 rounded text-[10px] font-mono text-game-primary border border-game-primary/20 uppercase animate-pulse">
                    [ FACE ]
                </div>
            </div>
        </div>
    );
};

export default HUDOverlay;
