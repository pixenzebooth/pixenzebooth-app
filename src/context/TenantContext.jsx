/**
 * TenantContext — Multi-Tenant State Provider
 *
 * Resolves tenant from the active License Token (`useLicense`).
 * Provides tenant data, branding, and subscription limits to the entire app.
 *
 * Usage:
 *   const { tenant, settings, subscription, isLoading } = useTenant();
 */
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLicense } from './LicenseContext';

const TenantContext = createContext();

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const { license, isLicensed } = useLicense();

    const [tenant, setTenant] = useState(null);
    const [settings, setSettings] = useState({
        primary_color: '#ef233c',
        secondary_color: '#face10',
        bg_image_url: '',
        logo_url: '',
        app_name: 'PixenzeBooth',
        audio_url: '',
    });
    const [subscription, setSubscription] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const channelRef = useRef(null);

    useEffect(() => {
        if (!isLicensed || !license?.tenant_id) {
            setTenant(null);
            setIsLoading(false);
            return;
        }

        const resolveTenant = async () => {
            await resolveTenantFromSupabase(license.tenant_id);
            setIsLoading(false);
        };

        resolveTenant();

        // Cleanup realtime channel
        return () => {
            if (channelRef.current) {
                try {
                    supabase.removeChannel(channelRef.current);
                } catch (e) {
                    console.warn("Error removing realtime channel during unmount:", e);
                }
            }
        };
    }, [isLicensed, license]);

    // Resolve tenant directly from Supabase using tenant_id
    const resolveTenantFromSupabase = async (tenantId) => {
        try {
            const { data: tenantData, error: tenantErr } = await supabase
                .from('tenants')
                .select('id, slug, name, is_active')
                .eq('id', tenantId)
                .eq('is_active', true)
                .maybeSingle();

            if (tenantErr || !tenantData) {
                setError('Tenant not found or inactive.');
                return;
            }

            setTenant(tenantData);

            // Get settings
            const { data: settingsData } = await supabase
                .from('tenant_settings')
                .select('*')
                .eq('tenant_id', tenantData.id)
                .maybeSingle();

            if (settingsData) {
                setSettings(prev => ({ ...prev, ...settingsData }));
            }

            // Get subscription
            const { data: subData } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('tenant_id', tenantData.id)
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (subData) {
                setSubscription(subData);
            }

            // Subscribe to realtime settings updates
            const channel = supabase
                .channel(`tenant_settings_${tenantData.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'tenant_settings',
                    filter: `tenant_id=eq.${tenantData.id}`,
                }, (payload) => {
                    if (payload.new) {
                        setSettings(prev => ({ ...prev, ...payload.new }));
                    }
                })
                .subscribe();

            channelRef.current = channel;
        } catch (e) {
            console.error('Failed to resolve tenant:', e);
            setError('Failed to load tenant data.');
        }
    };

    return (
        <TenantContext.Provider
            value={{
                tenant,
                tenantId: tenant?.id || null,
                tenantSlug: tenant?.slug || null,
                tenantName: tenant?.name || 'PixenzeBooth',
                settings,
                subscription,
                isLoading,
                error,
                hasTenant: !!tenant,
            }}
        >
            {children}
        </TenantContext.Provider>
    );
};
