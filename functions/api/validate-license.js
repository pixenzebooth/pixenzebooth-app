/**
 * Cloudflare Pages Function — Secure License Validation
 * POST /api/validate-license
 *
 * This runs server-side so:
 * 1. The Supabase service_role key is never exposed to the client
 * 2. Rate-limiting is enforced per IP
 * 3. Responses are HMAC-signed so the client can't forge license data
 */

// Simple HMAC-SHA256 using Web Crypto API (available in Cloudflare Workers)
async function hmacSign(secret, message) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

// Simple in-memory rate limiter (per-isolate, resets on cold start)
// For production at scale, use Cloudflare KV or Durable Objects
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 15; // max 15 attempts per 15 min per IP

function checkRateLimit(ip) {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry) {
        rateLimitMap.set(ip, { attempts: [now] });
        return { allowed: true, remaining: RATE_LIMIT_MAX_ATTEMPTS - 1 };
    }

    // Clean old attempts
    entry.attempts = entry.attempts.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    entry.attempts.push(now);
    rateLimitMap.set(ip, entry);

    const remaining = RATE_LIMIT_MAX_ATTEMPTS - entry.attempts.length;
    return { allowed: remaining >= 0, remaining: Math.max(0, remaining) };
}

// CORS headers helper
function corsHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // 1. Rate limiting
        const clientIp = request.headers.get('cf-connecting-ip') ||
            request.headers.get('x-forwarded-for') ||
            'unknown';
        const rateCheck = checkRateLimit(clientIp);

        if (!rateCheck.allowed) {
            return new Response(
                JSON.stringify({
                    valid: false,
                    error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
                }),
                { status: 429, headers: corsHeaders() }
            );
        }

        // 2. Parse request
        const body = await request.json();
        const { key } = body;

        if (!key || typeof key !== 'string' || key.trim().length < 4) {
            return new Response(
                JSON.stringify({ valid: false, error: 'License key is required' }),
                { status: 400, headers: corsHeaders() }
            );
        }

        const trimmedKey = key.trim().toUpperCase();

        // 3. Validate required env vars
        const supabaseUrl = env.SUPABASE_URL;
        const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
        const signingSecret = env.LICENSE_SIGNING_SECRET;

        if (!supabaseUrl || !supabaseServiceKey || !signingSecret) {
            console.error('Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or LICENSE_SIGNING_SECRET');
            return new Response(
                JSON.stringify({ valid: false, error: 'Server configuration error' }),
                { status: 500, headers: corsHeaders() }
            );
        }

        // 4. Query Supabase using service_role key (bypasses RLS — server-side only)
        const queryUrl = `${supabaseUrl}/rest/v1/licenses?license_key=eq.${encodeURIComponent(trimmedKey)}&select=id,license_key,owner_name,owner_email,plan,expires_at,activated_at,is_active,max_activations,activation_count`;
        const supabaseRes = await fetch(queryUrl, {
            headers: {
                apikey: supabaseServiceKey,
                Authorization: `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!supabaseRes.ok) {
            console.error('Supabase query failed:', await supabaseRes.text());
            return new Response(
                JSON.stringify({ valid: false, error: 'Validation service unavailable' }),
                { status: 502, headers: corsHeaders() }
            );
        }

        const rows = await supabaseRes.json();

        if (!rows || rows.length === 0) {
            // Uniform error message — don't reveal whether key exists or not
            return new Response(
                JSON.stringify({ valid: false, error: 'Invalid or expired license' }),
                { status: 200, headers: corsHeaders() }
            );
        }

        const license = rows[0];

        // 5. Server-side validation checks
        if (!license.is_active) {
            return new Response(
                JSON.stringify({ valid: false, error: 'License has been deactivated' }),
                { status: 200, headers: corsHeaders() }
            );
        }

        const now = new Date();
        const expiresAt = new Date(license.expires_at);
        if (expiresAt < now) {
            return new Response(
                JSON.stringify({ valid: false, error: 'License has expired' }),
                { status: 200, headers: corsHeaders() }
            );
        }

        // 6. Build signed response payload
        //    The signature prevents client-side tampering
        const payload = {
            id: license.id,
            owner_name: license.owner_name,
            owner_email: license.owner_email,
            plan: license.plan,
            expires_at: license.expires_at,
            activated_at: license.activated_at,
            validated_at: now.toISOString(),
        };

        const payloadStr = JSON.stringify(payload);
        const signature = await hmacSign(signingSecret, payloadStr);

        return new Response(
            JSON.stringify({
                valid: true,
                license: payload,
                signature: signature,
            }),
            { status: 200, headers: corsHeaders() }
        );
    } catch (error) {
        console.error('License validation error:', error);
        return new Response(
            JSON.stringify({ valid: false, error: 'Internal server error' }),
            { status: 500, headers: corsHeaders() }
        );
    }
}
