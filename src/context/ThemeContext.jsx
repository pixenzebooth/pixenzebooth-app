import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getEmbedData } from '../utils/mediaUtils';
import { supabase } from '../lib/supabase';

import { useTenant } from './TenantContext';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const { settings: tenantSettings, hasTenant, tenantId, isLoading } = useTenant();

    const [globalTheme, setGlobalTheme] = useState('default');
    const [globalAudio, setGlobalAudio] = useState(null);
    const [globalCustomConfig, setGlobalCustomConfig] = useState(null);
    const [customLogoUrl, setCustomLogoUrl] = useState(null);
    const [paymentConfig, setPaymentConfig] = useState({ enabled: false, amount: 15000, clientKey: '', isProduction: false });

    const [overrideTheme, setOverrideTheme] = useState(null);
    const [overrideAudio, setOverrideAudio] = useState(null);

    const [ytEmbedSrc, setYtEmbedSrc] = useState(null);
    const audioRef = useRef(null);

    // Active computed theme
    const theme = overrideTheme !== null ? overrideTheme : globalTheme;
    // Active computed audio
    const audioUrl = overrideAudio !== null && overrideAudio !== '' ? overrideAudio : (overrideAudio === '' ? null : globalAudio);

    useEffect(() => {
        if (isLoading) return; // Wait for TenantContext to resolve before falling back

        // If a tenant explicitly exists, use Tenant Settings instead of global_settings!
        if (hasTenant && tenantSettings) {
            setGlobalTheme(tenantSettings.active_theme || 'default');
            setGlobalAudio(tenantSettings.audio_url || null);
            setCustomLogoUrl(tenantSettings.custom_logo_url || null);
            setPaymentConfig({
                enabled: tenantSettings.payment_enabled || false,
                amount: tenantSettings.payment_amount || 15000,
                clientKey: tenantSettings.midtrans_client_key || '',
                isProduction: tenantSettings.is_midtrans_production || false
            });
            setGlobalCustomConfig({
                primaryColor: tenantSettings.primary_color || '#ba1c16',
                secondaryColor: tenantSettings.secondary_color || '#face10',
                bgImageUrl: tenantSettings.bg_image_url || ''
            });
            return; // Don't subscribe to global_settings since TenantContext handles realtime updates
        }

        // Fallback: Fetch global settings for bare localhost or main page
        // ⚠️ DEPRECATED: This path should only be used for demo/development.
        // In production, all tenants should be resolved via subdomain → TenantContext.
        console.warn('[ThemeContext] ⚠️ Falling back to global_settings (no tenant detected). ' +
            'This is expected in development but should NOT happen in production SaaS mode.');
        const fetchGlobalTheme = async () => {
            try {
                const { data } = await supabase.from('global_settings')
                    .select('active_theme, primary_color, secondary_color, bg_image_url, audio_url, custom_logo_url, payment_enabled, payment_amount, midtrans_client_key, is_midtrans_production')
                    .eq('id', 1).maybeSingle();
                if (data) {
                    setGlobalTheme(data.active_theme || 'default');
                    setGlobalAudio(data.audio_url || null);
                    setCustomLogoUrl(data.custom_logo_url || null);
                    setPaymentConfig({
                        enabled: data.payment_enabled || false,
                        amount: data.payment_amount || 15000,
                        clientKey: data.midtrans_client_key || '',
                        isProduction: data.is_midtrans_production || false
                    });
                    setGlobalCustomConfig({
                        primaryColor: data.primary_color || '#ba1c16',
                        secondaryColor: data.secondary_color || '#face10',
                        bgImageUrl: data.bg_image_url || ''
                    });
                }
            } catch (e) {
                console.error("Failed to load global theme", e);
            }
        };
        fetchGlobalTheme();

        // Listen to realtime updates for global settings only
        const channel = supabase.channel('theme_manager_global')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'global_settings', filter: 'id=eq.1' }, (payload) => {
                const data = payload.new;
                if (data) {
                    setGlobalTheme(data.active_theme || 'default');
                    setGlobalAudio(data.audio_url || null);
                    setCustomLogoUrl(data.custom_logo_url || null);
                    setPaymentConfig({
                        enabled: data.payment_enabled || false,
                        amount: data.payment_amount || 15000,
                        clientKey: data.midtrans_client_key || '',
                        isProduction: data.is_midtrans_production || false
                    });
                    setGlobalCustomConfig({
                        primaryColor: data.primary_color || '#ba1c16',
                        secondaryColor: data.secondary_color || '#face10',
                        bgImageUrl: data.bg_image_url || ''
                    });
                }
            }).subscribe();

        return () => supabase.removeChannel(channel);
    }, [hasTenant, tenantSettings]);

    // Public setter: accepts either a string OR { themeId, audioUrl } OR 'reset'
    const setTheme = (value) => {
        if (value === 'reset') {
            setOverrideTheme(null);
            setOverrideAudio(null);
        } else if (typeof value === 'object' && value !== null) {
            setOverrideTheme(value.themeId || 'default');
            setOverrideAudio(value.audioUrl || ''); // Empty string means mute
        } else {
            setOverrideTheme(value || 'default');
            setOverrideAudio(''); // Empty string means mute
        }
    };

    // Effect to apply visual theme classes + custom styles + audio
    useEffect(() => {
        // Remove all theme classes
        document.body.classList.remove('theme-valentine', 'theme-mu', 'theme-custom');

        // Remove old injected style
        const oldStyle = document.getElementById('custom-theme-style');
        if (oldStyle) oldStyle.remove();

        if (theme === 'valentine') {
            document.body.classList.add('theme-valentine');
        } else if (theme === 'mu') {
            document.body.classList.add('theme-mu');
        } else if (theme === 'custom' && globalCustomConfig) {
            document.body.classList.add('theme-custom');

            const styleEl = document.createElement('style');
            styleEl.id = 'custom-theme-style';

            // Generate CSS to override Tailwind classes dynamically
            styleEl.innerHTML = `
                body.theme-custom {
                    --bg-color-1: ${globalCustomConfig.primaryColor};
                    --bg-color-2: ${globalCustomConfig.secondaryColor};
                    --bg-color-3: #111111;
                    ${globalCustomConfig.bgImageUrl ? `background-image: url('${globalCustomConfig.bgImageUrl}'); background-size: cover; background-position: center; background-attachment: fixed;` : ''}
                }
                
                ${globalCustomConfig.bgImageUrl ? `
                body.theme-custom::before, body.theme-custom::after {
                    display: none !important;
                }
                ` : `
                body.theme-custom::before {
                    background-image: radial-gradient(circle at 50% 50%, ${globalCustomConfig.secondaryColor} 1px, transparent 1px) !important;
                    background-size: 50px 50px !important;
                    animation: none !important;
                    opacity: 0.3 !important;
                }
                body.theme-custom::after {
                    display: none !important;
                }
                `}
                
                body.theme-custom .bg-game-bg { background-color: ${globalCustomConfig.primaryColor} !important; }
                body.theme-custom .bg-game-bg-dark\\/95,
                body.theme-custom .bg-game-bg-dark\\/80,
                body.theme-custom .bg-game-bg-dark\\/70 { background-color: ${globalCustomConfig.primaryColor} !important; opacity: 0.95; }
                body.theme-custom .border-black { border-color: #111 !important; }
                body.theme-custom .text-game-accent,
                body.theme-custom .text-game-surface { color: #ffffff !important; }
                body.theme-custom .bg-game-primary { background-color: ${globalCustomConfig.primaryColor} !important; }
                body.theme-custom .bg-game-secondary { background-color: ${globalCustomConfig.secondaryColor} !important; }
                body.theme-custom .text-game-secondary, body.theme-custom .text-game-primary { color: ${globalCustomConfig.secondaryColor} !important; }
                body.theme-custom .shadow-game { box-shadow: 4px 4px 0px 0px rgba(0,0,0,0.6) !important; }
                body.theme-custom .border-game-secondary { border-color: ${globalCustomConfig.secondaryColor} !important; }
                
                body.theme-custom .btn-game-primary { background: linear-gradient(135deg, ${globalCustomConfig.primaryColor} 0%, #111 100%) !important; border-color: ${globalCustomConfig.secondaryColor} !important; color: #fff !important; }
                body.theme-custom .btn-game-accent { background: linear-gradient(135deg, #fff 0%, #eee 100%) !important; color: ${globalCustomConfig.primaryColor} !important; }
                body.theme-custom .btn-game-secondary { background: linear-gradient(135deg, ${globalCustomConfig.secondaryColor} 0%, #999 100%) !important; color: #111 !important; }
                body.theme-custom .card-game { background: rgba(255,255,255,0.1) !important; backdrop-filter: blur(10px) !important; border-color: ${globalCustomConfig.secondaryColor} !important; }
                body.theme-custom .text-stroke { -webkit-text-stroke-color: rgba(0,0,0, 0.6) !important; }
            `;
            document.head.appendChild(styleEl);
        }

        // Handle audio
        if (audioUrl) {
            playAudio(audioUrl);
        } else {
            stopAudio();
        }
    }, [theme, audioUrl, globalCustomConfig]);

    const playAudio = (src) => {
        const embedData = getEmbedData(src);
        if (embedData && embedData.type === 'youtube') {
            stopLocalAudio();
            setYtEmbedSrc(embedData.src);
            return;
        }

        // If local file or direct URL
        setYtEmbedSrc(null);
        if (!audioRef.current) {
            audioRef.current = new Audio(src);
            audioRef.current.loop = true;
        } else {
            const currentSrc = new URL(src, window.location.href).href;
            if (audioRef.current.src !== currentSrc) {
                audioRef.current.src = src;
            }
        }

        audioRef.current.play().catch(() => { });
    };

    const stopAudio = () => {
        setYtEmbedSrc(null);
        stopLocalAudio();
    };

    const stopLocalAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, customLogoUrl, paymentConfig }}>
            {children}
            {/* Hidden Iframe for YouTube Audio */}
            {ytEmbedSrc && (
                <iframe
                    width="1"
                    height="1"
                    src={ytEmbedSrc}
                    title="Background Audio"
                    frameBorder="0"
                    allow="autoplay; encrypted-media"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: -1 }}
                ></iframe>
            )}
        </ThemeContext.Provider>
    );
};
