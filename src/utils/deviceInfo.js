// Utility to generate/retrieve a unique device ID across Web and Electron environments.

const DEVICE_ID_KEY = 'pixenzebooth_device_id';

export async function getDeviceId() {
    // 1. Check Electron if available (for desktop app)
    if (window.electronAPI && typeof window.electronAPI.getMachineId === 'function') {
        try {
            return await window.electronAPI.getMachineId();
        } catch (e) {
            console.warn('Failed to get machine ID from Electron:', e);
        }
    }

    // 2. Check localStorage for existing ID (for web/browser)
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (deviceId) return deviceId;

    // 3. Generate new ID if none exists
    deviceId = `WEB-${crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
}
