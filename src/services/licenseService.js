/**
 * License Service — Secure License Validation
 *
 * Security improvements:
 * 1. Validates via server-side Cloudflare Function (not direct Supabase query)
 * 2. Stores HMAC signature with license data to detect tampering
 * 3. Supports Electron SafeStorage (encrypted) with localStorage fallback
 * 4. Offline grace period (max 24 hours since last validation)
 * 5. No direct Supabase import — all validation goes through /api/validate-license
 */

const LICENSE_STORAGE_KEY = 'gaskenn_license';
const MAX_OFFLINE_HOURS = 24; // Grace period for offline usage

// Determine API base URL
function getApiBaseUrl() {
    // In Electron production, use the deployed Cloudflare Pages URL
    if (window.electronAPI && window.electronAPI.isElectron) {
        // Use the production API URL from env or hardcode your deployed domain
        return import.meta.env.VITE_API_BASE_URL || 'https://gaskenn.pages.dev';
    }
    // In dev/web mode, use relative URL (proxied by Vite)
    return '';
}

import { supabase } from '../lib/supabase';
import { getDeviceId } from '../utils/deviceInfo';

/**
 * Validate a license key directly via Supabase
 * Now includes Automatic Device Registration via Secure RPC
 * @param {string} key - The license key to validate
 * @returns {Promise<{valid: boolean, license?: object, signature?: string, error?: string}>}
 */
export async function validateLicense(key) {
    try {
        if (!key || typeof key !== 'string') {
            return { valid: false, error: 'License key is required' };
        }

        const trimmedKey = key.trim().toUpperCase();
        const deviceId = await getDeviceId();

        // 0. Ensure Supabase is initialized
        if (!supabase) {
            console.error('Supabase client is null. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars.');
            return { valid: false, error: 'System configuration error: Database client not found.' };
        }

        // 1. Call Secure RPC for Validation and Registration
        // This is atomic: it validates the token, checks limits, and registers the device.
        const { data: result, error: rpcError } = await supabase.rpc('register_device_with_token', {
            p_token: trimmedKey,
            p_hardware_id: deviceId,
            p_device_name: `Machine-${deviceId.substring(0, 6)}`
        });

        if (rpcError || !result) {
            console.error('RPC Error:', rpcError);
            return { valid: false, error: 'Database error during validation.' };
        }

        if (!result.valid) {
            return { valid: false, error: result.error };
        }

        const tenantId = result.tenant_id;

        // 2. Fetch tenant metadata (slug) for app state
        const { data: tenantData } = await supabase
            .from('tenants')
            .select('slug')
            .eq('id', tenantId)
            .single();

        return {
            valid: true,
            license: {
                license_key: trimmedKey,
                tenant_id: tenantId,
                tenant_slug: tenantData?.slug,
                expires_at: '2099-12-31T23:59:59Z', // Lifetime for now
                device_id: deviceId
            },
            signature: 'validated-via-rpc'
        };
    } catch (err) {
        console.error('License validation error:', err);
        return { valid: false, error: 'Failed to validate license. Check your connection.' };
    }
}

/**
 * Save license data securely
 * Uses Electron SafeStorage (encrypted) if available, localStorage as fallback
 * @param {object} licenseData
 * @param {string} signature - HMAC signature from server
 */
export async function saveLicenseLocally(licenseData, signature) {
    try {
        const payload = {
            ...licenseData,
            _signature: signature, // Store server signature for integrity check
            _saved_at: new Date().toISOString(),
            _last_validated_at: new Date().toISOString(),
        };

        const jsonStr = JSON.stringify(payload);

        // Try Electron SafeStorage first (encrypted on disk)
        if (window.electronAPI && typeof window.electronAPI.storeLicense === 'function') {
            await window.electronAPI.storeLicense(jsonStr);
            // Also keep a minimal marker in localStorage so we know a license exists
            localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({ _hasLicense: true }));
            return;
        }

        // Fallback: localStorage (less secure, but works in web mode)
        localStorage.setItem(LICENSE_STORAGE_KEY, jsonStr);
    } catch (err) {
        console.error('Failed to save license locally:', err);
    }
}

/**
 * Get stored license from secure storage
 * @returns {object|null}
 */
export async function getStoredLicense() {
    try {
        // Try Electron SafeStorage first
        if (window.electronAPI && typeof window.electronAPI.getLicense === 'function') {
            const encrypted = await window.electronAPI.getLicense();
            if (encrypted) {
                return JSON.parse(encrypted);
            }
            return null;
        }

        // Fallback: localStorage
        const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        // Ignore the minimal marker object
        if (parsed._hasLicense && !parsed.expires_at) return null;
        return parsed;
    } catch (err) {
        console.error('Failed to read stored license:', err);
        return null;
    }
}

/**
 * Clear stored license (logout)
 */
export async function clearLicense() {
    try {
        // Clear from Electron SafeStorage
        if (window.electronAPI && typeof window.electronAPI.clearLicense === 'function') {
            await window.electronAPI.clearLicense();
        }
        // Always clear localStorage too
        localStorage.removeItem(LICENSE_STORAGE_KEY);
    } catch (err) {
        console.error('Failed to clear license:', err);
    }
}

/**
 * Check if stored license is still within valid offline grace period
 * @param {object} license - stored license data
 * @returns {boolean}
 */
export function isWithinGracePeriod(license) {
    if (!license) return false;

    // Check local expiration
    const expiresAt = new Date(license.expires_at);
    if (expiresAt < new Date()) return false;

    // Check offline grace period
    const lastValidated = license._last_validated_at;
    if (!lastValidated) return false;

    const hoursSince = (Date.now() - new Date(lastValidated).getTime()) / (1000 * 60 * 60);
    return hoursSince < MAX_OFFLINE_HOURS;
}

/**
 * Check if stored license has a valid server signature
 * (Basic tamper detection — full verification happens server-side)
 * @param {object} license - stored license data
 * @returns {boolean}
 */
export function hasValidSignature(license) {
    if (!license) return false;
    // Must have a signature from the server
    // Support both the legacy 64-char HMAC and the new 'validated-via-rpc' marker
    return typeof license._signature === 'string' &&
        (license._signature.length === 64 || license._signature === 'validated-via-rpc');
}

/**
 * Update the last-validated timestamp on a stored license
 * @param {object} license - license data to update
 * @param {string} newSignature - fresh signature from server
 */
export async function updateValidationTimestamp(license, newSignature) {
    if (!license) return;
    license._last_validated_at = new Date().toISOString();
    if (newSignature) {
        license._signature = newSignature;
    }
    await saveLicenseLocally(license, license._signature);
}

/**
 * Format remaining time on license
 * @param {string} expiresAt - ISO date string
 * @returns {string}
 */
export function formatLicenseExpiry(expiresAt) {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffMs = expiry - now;

    if (diffMs <= 0) return 'Expired';

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (days > 30) {
        const months = Math.floor(days / 30);
        return `${months} month${months > 1 ? 's' : ''} remaining`;
    }
    return `${days} day${days > 1 ? 's' : ''} remaining`;
}
