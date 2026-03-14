/**
 * Cloudflare Pages Function — Events CRUD
 * POST   /api/events   { action: "list" | "create" | "update" | "delete", ... }
 *
 * All operations require a valid Supabase access_token in the Authorization header.
 * Events are automatically scoped to the user's tenant via user_profiles.
 */

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

async function supabaseRest(env, path, options = {}) {
    const url = `${env.SUPABASE_URL}/rest/v1/${path}`;
    const res = await fetch(url, {
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: options.prefer || 'return=representation',
        },
        method: options.method || 'GET',
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

// Verify the user's access token and return their profile
async function verifyAuth(env, authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase Auth
    const userRes = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
        headers: {
            apikey: env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${token}`,
        },
    });

    if (!userRes.ok) return null;
    const user = await userRes.json();

    // Get profile with tenant_id
    const profileRes = await supabaseRest(env, `user_profiles?id=eq.${user.id}&select=tenant_id,role`);
    if (!profileRes.ok || !profileRes.data.length) return null;

    return { user_id: user.id, ...profileRes.data[0] };
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const profile = await verifyAuth(env, request.headers.get('Authorization'));
        if (!profile) {
            return jsonResponse({ success: false, error: 'Unauthorized.' }, 401);
        }

        const body = await request.json();
        const { action } = body;

        switch (action) {
            case 'list':
                return await listEvents(env, profile);
            case 'create':
                return await createEvent(env, profile, body);
            case 'update':
                return await updateEvent(env, profile, body);
            case 'delete':
                return await deleteEvent(env, profile, body);
            default:
                return jsonResponse({ success: false, error: 'Invalid action.' }, 400);
        }
    } catch (error) {
        console.error('events error:', error);
        return jsonResponse({ success: false, error: 'Internal server error.' }, 500);
    }
}

// Public GET for gallery — resolve event by slug
export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        const url = new URL(request.url);
        const slug = url.searchParams.get('slug');
        const tenantSlug = url.searchParams.get('tenant');

        if (!slug) {
            return jsonResponse({ success: false, error: 'Event slug is required.' }, 400);
        }

        let query = `events?slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=id,tenant_id,event_name,event_date,slug,description`;

        // If tenant slug is provided, filter by tenant
        if (tenantSlug) {
            const tenantRes = await supabaseRest(env, `tenants?slug=eq.${encodeURIComponent(tenantSlug)}&select=id`);
            if (tenantRes.data && tenantRes.data.length) {
                query += `&tenant_id=eq.${tenantRes.data[0].id}`;
            }
        }

        const res = await supabaseRest(env, query);
        if (!res.ok || !res.data.length) {
            return jsonResponse({ success: false, error: 'Event not found.' }, 404);
        }

        const event = res.data[0];

        // Get photos for this event
        const photosRes = await supabaseRest(env,
            `photos?event_id=eq.${event.id}&select=id,photo_url,created_at&order=created_at.desc`
        );

        return jsonResponse({
            success: true,
            event,
            photos: photosRes.data || [],
        });

    } catch (error) {
        console.error('events GET error:', error);
        return jsonResponse({ success: false, error: 'Internal server error.' }, 500);
    }
}

// --- CRUD Operations ---

async function listEvents(env, profile) {
    const res = await supabaseRest(env,
        `events?tenant_id=eq.${profile.tenant_id}&select=*&order=event_date.desc`
    );
    return jsonResponse({ success: true, events: res.data || [] });
}

async function createEvent(env, profile, body) {
    const { event_name, event_date, slug, description } = body;

    if (!event_name || !slug) {
        return jsonResponse({ success: false, error: 'event_name and slug are required.' }, 400);
    }

    // Check subscription event limit
    const subRes = await supabaseRest(env,
        `subscriptions?tenant_id=eq.${profile.tenant_id}&status=eq.active&select=event_limit&order=created_at.desc&limit=1`
    );
    const sub = subRes.data && subRes.data.length ? subRes.data[0] : null;

    if (sub) {
        const countRes = await supabaseRest(env,
            `events?tenant_id=eq.${profile.tenant_id}&select=id`
        );
        const currentCount = countRes.data ? countRes.data.length : 0;
        if (currentCount >= sub.event_limit) {
            return jsonResponse({
                success: false,
                error: `Event limit reached (${sub.event_limit}). Upgrade your plan.`
            }, 403);
        }
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');

    const res = await supabaseRest(env, 'events', {
        method: 'POST',
        body: {
            tenant_id: profile.tenant_id,
            event_name,
            event_date: event_date || null,
            slug: cleanSlug,
            description: description || null,
        },
    });

    if (!res.ok) {
        const errMsg = Array.isArray(res.data) ? 'Failed to create event.' : (res.data.message || 'Failed to create event.');
        return jsonResponse({ success: false, error: errMsg }, res.status);
    }

    return jsonResponse({ success: true, event: res.data[0] }, 201);
}

async function updateEvent(env, profile, body) {
    const { event_id, ...updates } = body;
    if (!event_id) {
        return jsonResponse({ success: false, error: 'event_id is required.' }, 400);
    }

    // Remove non-updatable fields
    delete updates.action;
    delete updates.tenant_id;
    delete updates.id;

    if (updates.slug) {
        updates.slug = updates.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    const res = await supabaseRest(env,
        `events?id=eq.${event_id}&tenant_id=eq.${profile.tenant_id}`,
        { method: 'PATCH', body: updates }
    );

    if (!res.ok || !res.data.length) {
        return jsonResponse({ success: false, error: 'Event not found or update failed.' }, 404);
    }

    return jsonResponse({ success: true, event: res.data[0] });
}

async function deleteEvent(env, profile, body) {
    const { event_id } = body;
    if (!event_id) {
        return jsonResponse({ success: false, error: 'event_id is required.' }, 400);
    }

    const res = await supabaseRest(env,
        `events?id=eq.${event_id}&tenant_id=eq.${profile.tenant_id}`,
        { method: 'DELETE' }
    );

    return jsonResponse({ success: true, message: 'Event deleted.' });
}
