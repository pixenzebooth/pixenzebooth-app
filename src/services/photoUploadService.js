/**
 * Photo Upload Service — Signed Upload URL Flow
 *
 * Uses Supabase Storage (or R2 via proxy) via signed URLs.
 *
 * Flow:
 *   1. requestSignedUploadUrl() → gets signed URL + photo_id from backend
 *   2. uploadPhotoToStorage() → uploads file directly to Supabase Storage
 *   3. confirmPhotoUpload() → registers photo in database
 *
 * Full helper: uploadPhoto() — does all 3 steps in one call.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function getAccessToken() {
    try {
        const { supabase } = await import('../lib/supabase');
        if (!supabase) return null;

        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (e) {
        console.error("Failed to retrieve access token:", e);
        return null;
    }
}

/**
 * Step 1: Request a signed upload URL from the backend
 * @param {string} eventId - Event UUID
 * @param {string} filename - Original filename (e.g., "photo.jpg")
 * @param {string} contentType - MIME type (e.g., "image/jpeg")
 * @returns {{ photo_id, file_path, upload_url, method, upload_headers?, upload_token? }}
 */
export async function requestSignedUploadUrl(eventId, filename, contentType = 'image/jpeg', tenantId = 'default', sessionId = null, tier = 'cold', category = 'gallery') {
    const token = await getAccessToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/signed-upload-url`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ 
            event_id: eventId, 
            filename, 
            content_type: contentType,
            tenant_id: tenantId,
            session_id: sessionId,
            tier: tier,
            category: category
        }),
    });

    if (!res.ok) {
        let errorMsg = 'Failed to get upload URL.';
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            errorMsg = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    const data = await res.json();
    return data;
}

/**
 * Step 2: Upload file directly to Supabase Storage using signed URL
 * @param {string} uploadUrl - The signed upload URL
 * @param {Blob|File} fileBlob - The file to upload
 * @param {string} contentType - MIME type
 * @param {string} method - HTTP method (PUT or POST)
 * @param {Object} uploadHeaders - Additional headers (for fallback mode)
 * @param {Function} onProgress - Progress callback (0-100)
 */
export async function uploadPhotoToStorage(uploadUrl, fileBlob, contentType = 'image/jpeg', method = 'PUT', uploadHeaders = null, onProgress = null) {
    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(method, uploadUrl, true);

        // Set headers
        xhr.setRequestHeader('Content-Type', contentType);
        if (uploadHeaders) {
            Object.entries(uploadHeaders).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });
        }

        // Progress tracking
        if (onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve({ success: true, status: xhr.status });
            } else {
                let errorDetails = '';
                try {
                    const response = JSON.parse(xhr.responseText);
                    errorDetails = response.error || response.message || xhr.responseText;
                } catch (e) {
                    errorDetails = xhr.responseText || `Status ${xhr.status}`;
                }
                reject(new Error(`Upload failed (${xhr.status}): ${errorDetails}`));
            }
        };

        xhr.onerror = () => reject(new Error('Upload failed due to network error (Check CORS or Internet).'));
        xhr.ontimeout = () => reject(new Error('Upload timed out (Connection too slow).'));
        xhr.timeout = 120000; // 2 minute timeout

        xhr.send(fileBlob);
    });
}

/**
 * Step 3: Confirm upload — register photo in database
 * @param {string} photoId - Photo UUID from step 1
 * @param {string} eventId - Event UUID
 * @param {string} filePath - Storage path from step 1
 * @param {number} fileSize - File size in bytes
 * @param {string} storageProvider - 'r2' or 'supabase'
 * @returns {{ photo: { id, photo_url, file_path, created_at } }}
 */
export async function confirmPhotoUpload(photoId, eventId, filePath, fileSize, storageProvider = 'supabase') {
    const token = await getAccessToken();
    
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/confirm-upload`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
            photo_id: photoId,
            event_id: eventId,
            file_path: filePath,
            file_size: fileSize,
            storage_provider: storageProvider
        }),
    });

    if (!res.ok) {
        let errorMsg = 'Failed to confirm upload.';
        try {
            const errorData = await res.json();
            errorMsg = errorData.error || errorMsg;
        } catch (e) {
            errorMsg = `Server error: ${res.status} ${res.statusText}`;
        }
        throw new Error(errorMsg);
    }

    const data = await res.json();
    return data;
}

/**
 * Full upload flow — does all 3 steps in one call
 * @param {string} eventId - Event UUID
 * @param {Blob} photoBlob - Photo as a Blob
 * @param {string} filename - Original filename
 * @param {Function} onProgress - Progress callback (0-100)
 * @param {Function} onStatus - Status text callback
 * @param {string} tenantId - Tenant ID
 * @param {string} sessionId - Session ID
 * @param {string} tier - Storage tier ('hot' or 'cold')
 * @param {string} category - Functional category ('gallery', 'assets', 'logs')
 * @returns {{ photo_url: string, photo_id: string }}
 */
export async function uploadPhoto(eventId, photoBlob, filename = 'photo.jpg', onProgress = null, onStatus = null, tenantId = 'default', sessionId = null, tier = 'hot', category = 'gallery') {
    // Step 1: Get signed URL
    if (onStatus) onStatus('Requesting upload URL...');
    const contentType = photoBlob.type || 'image/jpeg';
    const signedData = await requestSignedUploadUrl(eventId, filename, contentType, tenantId, sessionId, tier, category);

    // Step 2: Upload directly to Storage
    if (onStatus) onStatus('Uploading photo...');
    await uploadPhotoToStorage(
        signedData.upload_url,
        photoBlob,
        contentType,
        signedData.method || 'PUT',
        signedData.upload_headers || null,
        onProgress
    );

    // Step 3: Confirm upload
    if (onStatus) onStatus('Finalizing...');
    const confirmed = await confirmPhotoUpload(
        signedData.photo_id,
        eventId,
        signedData.file_path,
        photoBlob.size,
        signedData.storage_provider || 'supabase'
    );

    return {
        photo_url: confirmed.photo.photo_url,
        photo_id: confirmed.photo.id,
        file_path: confirmed.photo.file_path,
        created_at: confirmed.photo.created_at,
    };
}

/**
 * Upload multiple photos for an event
 * @param {string} eventId
 * @param {Array<{blob: Blob, filename: string}>} files
 * @param {Function} onOverallProgress - (current, total) callback
 * @param {Function} onStatus - Status text callback
 * @returns {Array<{photo_url, photo_id}>}
 */
export async function uploadMultiplePhotos(eventId, files, onOverallProgress = null, onStatus = null) {
    const results = [];

    for (let i = 0; i < files.length; i++) {
        const { blob, filename } = files[i];
        if (onStatus) onStatus(`Uploading ${i + 1} of ${files.length}...`);

        const result = await uploadPhoto(eventId, blob, filename, null, null);
        results.push(result);

        if (onOverallProgress) onOverallProgress(i + 1, files.length);
    }

    return results;
}

/**
 * Convert a data URI (base64) to a Blob
 */
export function dataURItoBlob(dataURI) {
    const parts = dataURI.split(',');
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const byteStr = atob(parts[1]);
    const arr = new Uint8Array(byteStr.length);
    for (let i = 0; i < byteStr.length; i++) {
        arr[i] = byteStr.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
}

/**
 * Convert a blob URL or Data URI to a Blob object
 */
export async function blobUrlToBlob(url) {
    if (url.startsWith('data:')) {
        return dataURItoBlob(url);
    }
    const res = await fetch(url);
    return await res.blob();
}

/**
 * Uploads multiple Blobs/Files to predictable R2 paths relative to a primary photo ID.
 * Used for storing GIF, Video, and Raw photos for the slider.
 */
export async function uploadMultipleToPredictablePaths(eventId, assets, onStatus = null, tenantId = 'default', sessionId = null, tier = 'cold', category = 'gallery') {
    const results = [];
    for (const asset of assets) {
        try {
            if (onStatus) onStatus(`Uploading ${asset.label}...`);
            
            // Step 1: Request signed URL with custom filename
            const signedData = await requestSignedUploadUrl(eventId, asset.filename, asset.blob.type, tenantId, sessionId, tier, category);
            
            // Step 2: Upload to Storage
            await uploadPhotoToStorage(
                signedData.upload_url,
                asset.blob,
                asset.blob.type,
                signedData.method || 'PUT',
                signedData.upload_headers || null
            );
            
            // Step 3: Confirm (So it's registered, though we might not use the ID directly)
            const confirmed = await confirmPhotoUpload(
                signedData.photo_id,
                eventId,
                signedData.file_path,
                asset.blob.size,
                signedData.storage_provider || 'supabase'
            );
            
            results.push({
                type: asset.type,
                url: confirmed.photo.photo_url,
                path: confirmed.photo.file_path
            });
        } catch (err) {
            console.warn(`Failed to upload predictable asset ${asset.type}:`, err);
        }
    }
    return results;
}
