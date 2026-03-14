/**
 * Cloudflare Pages Function — Confirm Photo Upload
 * POST /api/confirm-upload
 *
 * Called by the device AFTER a successful direct upload to Supabase Storage.
 * Registers the photo in the `photos` table so it appears in the gallery.
 *
 * Body: { photo_id, event_id, file_path, file_size }
 */

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
        R2_PUBLIC_URL: env.R2_PUBLIC_URL || env.VITE_R2_PUBLIC_URL,
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
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, R2_PUBLIC_URL } = resolved;

        // Validate critical env vars
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            console.error('[confirm-upload] Missing env vars. SUPABASE_URL:', !!SUPABASE_URL, 'SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
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

        // 2. Parse body
        const { photo_id, event_id, file_path, file_size, storage_provider } = await request.json();
        if (!photo_id || !event_id || !file_path) {
            return jsonResponse({ success: false, error: 'photo_id, event_id, and file_path are required.' }, 400);
        }

        // 3. Resolve Tenant ID
        let tenantId = authInfo.tenant_id;
        
        // If guest, fetch tenant_id from the event
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
                return jsonResponse({ success: false, error: 'Could not verify event ownership.' }, 500);
            }

            const eventData = await eventLookupRes.json();
            if (!eventData.length) {
                return jsonResponse({ success: false, error: 'Event not found or invalid.' }, 404);
            }
            tenantId = eventData[0].tenant_id;
        }

        if (!tenantId) {
            return jsonResponse({ success: false, error: 'Could not resolve tenant for this photo.' }, 400);
        }

        // 4. Generate public URL for the uploaded file
        let publicUrl;
        if (storage_provider === 'r2' && R2_PUBLIC_URL) {
            const baseUrl = R2_PUBLIC_URL.endsWith('/') ? R2_PUBLIC_URL.slice(0, -1) : R2_PUBLIC_URL;
            publicUrl = `${baseUrl}/${file_path.startsWith('/') ? file_path.slice(1) : file_path}`;
            console.log(`[confirm-upload] Generated R2 Public URL: ${publicUrl}`);
        } else {
            publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${file_path.startsWith('/') ? file_path.slice(1) : file_path}`;
            console.log(`[confirm-upload] Generated Supabase Public URL: ${publicUrl}`);
        }

        // 5. Insert photo record into database
        const insertUrl = `${SUPABASE_URL}/rest/v1/photos`;
        const insertRes = await fetch(insertUrl, {
            method: 'POST',
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=representation',
            },
            body: JSON.stringify({
                id: photo_id,
                event_id,
                tenant_id: tenantId,
                photo_url: publicUrl,
                file_path,
                file_size: file_size || 0,
            }),
        });

        if (!insertRes.ok) {
            const err = await insertRes.json();
            console.error('Photo insert failed:', err);
            return jsonResponse({ 
                success: false, 
                error: 'Failed to register photo.',
                message: err.message,
                code: err.code
            }, 500);
        }

        const photos = await insertRes.json();
        const photo = photos[0];

        return jsonResponse({
            success: true,
            photo: {
                id: photo.id,
                photo_url: photo.photo_url,
                file_path: photo.file_path,
                created_at: photo.created_at,
            },
        }, 201);

    } catch (error) {
        console.error('confirm-upload error:', error);
        return jsonResponse({ 
            success: false, 
            error: 'Internal server error.',
            message: error.message,
            stack: error.stack?.split('\n')[0]
        }, 500);
    }
}
