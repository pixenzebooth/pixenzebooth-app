/**
 * Cloudflare Pages Function — Resolve Tenant
 * GET /api/resolve-tenant?slug=studio-abc
 *
 * Resolves a tenant from its subdomain slug.
 * Used by:
 *   - Electron app on startup (resolve tenant from subdomain)
 *   - Gallery pages (resolve tenant for event lookup)
 *   - Landing page (verify tenant exists)
 *
 * No auth required — returns public tenant info only.
 */

function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

function jsonResponse(body, status = 200) {
    return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        const url = new URL(request.url);
        const slug = url.searchParams.get('slug');

        if (!slug || slug.trim().length < 2) {
            return jsonResponse({ success: false, error: 'Tenant slug is required.' }, 400);
        }

        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = env;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
        }

        const cleanSlug = slug.trim().toLowerCase();

        // 1. Look up tenant
        const tenantUrl = `${SUPABASE_URL}/rest/v1/tenants?slug=eq.${encodeURIComponent(cleanSlug)}&is_active=eq.true&select=id,slug,name`;
        const tenantRes = await fetch(tenantUrl, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
        });

        if (!tenantRes.ok) {
            return jsonResponse({ success: false, error: 'Service unavailable.' }, 502);
        }

        const tenants = await tenantRes.json();
        if (!tenants.length) {
            return jsonResponse({ success: false, error: 'Tenant not found.' }, 404);
        }

        const tenant = tenants[0];

        // 2. Get tenant settings
        const settingsUrl = `${SUPABASE_URL}/rest/v1/tenant_settings?tenant_id=eq.${tenant.id}&select=primary_color,secondary_color,bg_image_url,logo_url,app_name,audio_url`;
        const settingsRes = await fetch(settingsUrl, {
            headers: {
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
        });

        const settings = settingsRes.ok ? (await settingsRes.json())[0] || {} : {};

        return jsonResponse({
            success: true,
            tenant: {
                id: tenant.id,
                slug: tenant.slug,
                name: tenant.name,
                settings,
            },
        });

    } catch (error) {
        console.error('resolve-tenant error:', error);
        return jsonResponse({ success: false, error: 'Internal server error.' }, 500);
    }
}
