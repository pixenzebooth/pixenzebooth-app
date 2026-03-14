/**
 * Cloudflare Pages Function — Generate Signed Upload URL
 * POST /api/signed-upload-url
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

function resolveEnv(env) {
    return {
        SUPABASE_URL: env.SUPABASE_URL || env.VITE_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY,
        R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
        R2_ENDPOINT: env.R2_ENDPOINT,
        R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    };
}

async function verifyAuth(env, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');
    const resolved = resolveEnv(env);

    // 1. Get user from Supabase Auth
    const userRes = await fetch(`${resolved.SUPABASE_URL}/auth/v1/user`, {
        headers: {
            apikey: resolved.SUPABASE_ANON_KEY || resolved.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${token}`,
        },
    });

    if (!userRes.ok) return null;
    const user = await userRes.json();

    // 2. Try to get profile (for Admin/Tenant users)
    const profileUrl = `${resolved.SUPABASE_URL}/rest/v1/user_profiles?id=eq.${user.id}&select=tenant_id,role`;
    const profileRes = await fetch(profileUrl, {
        headers: {
            apikey: resolved.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${resolved.SUPABASE_SERVICE_ROLE_KEY}`,
        },
    });

    let profile = null;
    if (profileRes.ok) {
        const profiles = await profileRes.json();
        if (profiles.length > 0) {
            profile = { user_id: user.id, ...profiles[0] };
        }
    }

    // If no profile found, treat as a guest/anon user
    if (!profile) {
        return { user_id: user.id, role: 'anon', is_guest: true };
    }

    return profile;
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const resolved = resolveEnv(env);
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET_NAME } = resolved;

        // Validate critical env vars
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[signed-upload-url] Missing env vars. SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
            return jsonResponse({ success: false, error: 'Server misconfiguration: missing database credentials.' }, 500);
        }

        // 1. Auth check (Optional for public guest mode)
        const authHeader = request.headers.get('Authorization');
        let authInfo = null;
        
        if (authHeader) {
            authInfo = await verifyAuth(env, authHeader);
            if (!authInfo) {
                return jsonResponse({ success: false, error: 'Invalid or expired session.' }, 401);
            }
        } else {
            // No token provided -> Public Guest Mode
            authInfo = { is_guest: true, role: 'public_guest' };
        }

        // 2. Parse request
        const body = await request.json();
        const { event_id, filename, content_type } = body;
        
        if (!event_id || !filename) {
            return jsonResponse({ success: false, error: 'event_id and filename are required.' }, 400);
        }

        // 3. Resolve Tenant ID & Validate Event
        let tenantId = authInfo.tenant_id;
        
        // If guest (or admin without tenant_id context), fetch tenant_id from the event
        if (authInfo.is_guest || !tenantId) {
            const eventLookupUrl = `${SUPABASE_URL}/rest/v1/events?id=eq.${event_id}&select=tenant_id`;
            const eventLookupRes = await fetch(eventLookupUrl, {
                headers: {
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                },
            });

            if (!eventLookupRes.ok) {
                console.error('Event lookup failed:', await eventLookupRes.text());
                return jsonResponse({ success: false, error: 'Could not verify event.' }, 500);
            }

            const eventData = await eventLookupRes.json();
            if (!eventData.length) {
                return jsonResponse({ success: false, error: 'Event not found or invalid.' }, 404);
            }
            tenantId = eventData[0].tenant_id;
        }

        if (!tenantId) {
            return jsonResponse({ success: false, error: 'Could not resolve tenant for this upload.' }, 400);
        }

        // 4. Generate file path: photos/{tenant_id}/{event_id}/{filename}_{short_id}.ext
        const photoId = crypto.randomUUID();
        const ext = filename.includes('.') ? filename.split('.').pop().toLowerCase() : 'jpg';
        let baseName = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
        
        // Sanitize baseName: keep alphanumeric, dashes, and underscores
        baseName = baseName.replace(/[^a-z0-9_-]/gi, '_').substring(0, 50);
        
        // Use a part of the UUID to ensure uniqueness while keeping the filename readable
        const shortId = photoId.split('-')[0]; // first 8 chars
        const filePath = `photos/${tenantId}/${event_id}/${baseName}_${shortId}.${ext}`;

        // 5. Generate R2 Signed URL if configured
        if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ENDPOINT && R2_BUCKET_NAME) {
            const s3 = new S3Client({
                region: "auto",
                endpoint: R2_ENDPOINT,
                credentials: {
                    accessKeyId: R2_ACCESS_KEY_ID,
                    secretAccessKey: R2_SECRET_ACCESS_KEY,
                },
            });

            const command = new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: filePath,
                ContentType: content_type || 'image/jpeg',
            });

            const signedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

            return jsonResponse({
                success: true,
                photo_id: photoId,
                file_path: filePath,
                upload_url: signedUrl,
                method: 'PUT',
                expires_in: 600,
                storage_provider: 'r2'
            });
        }

        // 6. Fallback to Supabase Storage signed URL
        const signedUploadUrl = `${SUPABASE_URL}/storage/v1/object/upload/sign/photos/${filePath}`;
        const signRes = await fetch(signedUploadUrl, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ expiresIn: 600 }),
        });

        if (signRes.ok) {
            const signData = await signRes.json();
            return jsonResponse({
                success: true,
                photo_id: photoId,
                file_path: filePath,
                upload_url: `${SUPABASE_URL}/storage/v1${signData.url}`,
                upload_token: signData.token,
                method: 'PUT',
                storage_provider: 'supabase'
            });
        }

        return jsonResponse({ success: false, error: 'Failed to generate upload URL.' }, 500);

    } catch (error) {
        console.error('signed-upload-url error:', error);
        return jsonResponse({ 
            success: false, 
            error: 'Internal server error.', 
            message: error.message,
            stack: error.stack?.split('\n')[0]
        }, 500);
    }
}
