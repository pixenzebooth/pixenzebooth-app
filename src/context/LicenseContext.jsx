import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
    validateLicense,
    saveLicenseLocally,
    getStoredLicense,
    clearLicense,
    isWithinGracePeriod,
    hasValidSignature,
    updateValidationTimestamp,
} from '../services/licenseService';

const LicenseContext = createContext();

export const useLicense = () => useContext(LicenseContext);

export const LicenseProvider = ({ children }) => {
    const [license, setLicense] = useState(null);
    const [isValidating, setIsValidating] = useState(true);
    const [isLicensed, setIsLicensed] = useState(false);
    const [error, setError] = useState(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const revalidationRef = useRef(null);

    // Stronger Electron environment check
    const isDesktop = (() => {
        try {
            return (
                !!window.electronAPI &&
                window.electronAPI.isElectron === true &&
                typeof window.electronAPI.getAppVersion === 'function' &&
                navigator.userAgent.includes('Electron')
            );
        } catch {
            return false;
        }
    })();

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-validate on mount
    useEffect(() => {
        const initLicense = async () => {
            const stored = await getStoredLicense();

            if (!stored || !stored.expires_at) {
                // No stored license
                setIsValidating(false);
                return;
            }

            // Check if the stored license has a valid server signature
            if (!hasValidSignature(stored)) {
                // Tampered or old-format license — reject it
                console.warn('License data has no valid signature. Clearing.');
                await clearLicense();
                setIsValidating(false);
                setError('License data is invalid. Please re-activate.');
                return;
            }

            // Try server revalidation first
            if (navigator.onLine) {
                const result = await validateLicense(stored.license_key || stored._license_key_hint || '');

                if (result.valid) {
                    await updateValidationTimestamp(result.license, result.signature);
                    setLicense(result.license);
                    setIsLicensed(true);
                    setIsValidating(false);
                    return;
                }

                // Server says invalid — force logout
                await clearLicense();
                setIsValidating(false);
                setError(result.error || 'License is no longer valid');
                return;
            }

            // Offline — check grace period
            if (isWithinGracePeriod(stored)) {
                setLicense(stored);
                setIsLicensed(true);
                setIsValidating(false);
                return;
            }

            // Offline and grace period expired — reject
            await clearLicense();
            setIsValidating(false);
            setError('Offline grace period expired (24 hours). Please connect to the internet to re-validate.');
        };

        initLicense();
    }, [isDesktop]);

    // Periodic license revalidation (every 30 minutes)
    useEffect(() => {
        if (!isLicensed || !license) return;

        const interval = setInterval(async () => {
            if (!navigator.onLine) {
                // Offline — check grace period
                const stored = await getStoredLicense();
                if (!isWithinGracePeriod(stored)) {
                    setIsLicensed(false);
                    setLicense(null);
                    await clearLicense();
                    setError('Offline grace period expired. Please connect to the internet.');
                }
                return;
            }

            // Online — revalidate with server
            const stored = await getStoredLicense();
            const keyToValidate = stored?.license_key || stored?._license_key_hint || '';

            if (!keyToValidate) {
                setIsLicensed(false);
                setLicense(null);
                await clearLicense();
                return;
            }

            const result = await validateLicense(keyToValidate);
            if (result.valid) {
                // Update validation timestamp
                await updateValidationTimestamp(result.license, result.signature);
                setLicense(result.license);
            } else {
                setIsLicensed(false);
                setLicense(null);
                await clearLicense();
                setError(result.error || 'License expired');
            }
        }, 30 * 60 * 1000);

        revalidationRef.current = interval;
        return () => clearInterval(interval);
    }, [isDesktop, isLicensed, license]);

    // When coming back online, immediately revalidate
    useEffect(() => {
        if (!isLicensed || isOffline) return;

        const revalidateNow = async () => {
            const stored = await getStoredLicense();
            const keyToValidate = stored?.license_key || stored?._license_key_hint || '';
            if (!keyToValidate) return;

            const result = await validateLicense(keyToValidate);
            if (result.valid) {
                await updateValidationTimestamp(result.license, result.signature);
                setLicense(result.license);
            } else {
                setIsLicensed(false);
                setLicense(null);
                await clearLicense();
                setError(result.error || 'License is no longer valid');
            }
        };

        // Small delay to let network stabilize
        const timeout = setTimeout(revalidateNow, 2000);
        return () => clearTimeout(timeout);
    }, [isOffline, isDesktop, isLicensed]);

    const activateLicense = useCallback(async (key) => {
        setIsValidating(true);
        setError(null);

        const result = await validateLicense(key);

        if (result.valid) {
            // Store key hint for future revalidation
            // (server intentionally doesn't return the key in the response)
            const licenseWithKeyHint = {
                ...result.license,
                _license_key_hint: key.trim().toUpperCase(),
            };
            setLicense(licenseWithKeyHint);
            setIsLicensed(true);
            await saveLicenseLocally(licenseWithKeyHint, result.signature);
            setError(null);
        } else {
            setError(result.error);
            setIsLicensed(false);
        }

        setIsValidating(false);
        return result;
    }, []);

    const deactivateLicense = useCallback(async () => {
        setLicense(null);
        setIsLicensed(false);
        await clearLicense();
        setError(null);
    }, []);

    return (
        <LicenseContext.Provider
            value={{
                license,
                isLicensed,
                isValidating,
                error,
                isDesktop,
                isOffline,
                activateLicense,
                deactivateLicense,
            }}
        >
            {children}
        </LicenseContext.Provider>
    );
};
