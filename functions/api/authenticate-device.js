/**
 * Cloudflare Pages Function — Device Authentication
 * POST /api/authenticate-device
 *
 * Replaces the old validate-license.js.
 * Flow:
 *   1. Device sends { email, password, hardware_id, device_name }
 *   2. Authenticates via Supabase Auth
 *   3. Looks up user_profiles for tenant_id + role
 *   4. Registers or validates device in devices table
 *   5. Checks subscription limits
 *   6. Returns signed session payload
 */

// --- Shared Utilities ---

async function hmacSign(secret, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const rateLimitMap = new Map();
function checkRateLimit(ip, maxAttempts = 15, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { attempts: [now] });
    return { allowed: true };
  }
  entry.attempts = entry.attempts.filter(t => now - t < windowMs);
  entry.attempts.push(now);
  return { allowed: entry.attempts.length <= maxAttempts };
}

function corsHeaders(methods = 'POST, OPTIONS') {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
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
      ...options.headers,
    },
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

// --- Handlers ---

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1. Rate limiting
    const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
    if (!checkRateLimit(clientIp).allowed) {
      return jsonResponse({ success: false, error: 'Too many attempts. Try again later.' }, 429);
    }

    // 2. Parse request
    const { email, password, hardware_id, device_name } = await request.json();
    if (!email || !password) {
      return jsonResponse({ success: false, error: 'Email and password are required.' }, 400);
    }

    // 3. Validate env vars
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LICENSE_SIGNING_SECRET } = env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !LICENSE_SIGNING_SECRET) {
      return jsonResponse({ success: false, error: 'Server configuration error.' }, 500);
    }

    // 4. Authenticate with Supabase Auth
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!authRes.ok) {
      const authErr = await authRes.json();
      return jsonResponse({ success: false, error: authErr.error_description || 'Invalid credentials.' }, 401);
    }

    const authData = await authRes.json();
    const userId = authData.user.id;
    const accessToken = authData.access_token;

    // 5. Get user_profile (tenant_id, role)
    const profileRes = await supabaseRest(env, `user_profiles?id=eq.${userId}&select=tenant_id,role`);
    if (!profileRes.ok || !profileRes.data.length) {
      return jsonResponse({ success: false, error: 'User profile not found. Contact support.' }, 403);
    }

    const profile = profileRes.data[0];
    const tenantId = profile.tenant_id;

    // 6. Check tenant is active
    const tenantRes = await supabaseRest(env, `tenants?id=eq.${tenantId}&select=id,slug,name,is_active`);
    if (!tenantRes.ok || !tenantRes.data.length || !tenantRes.data[0].is_active) {
      return jsonResponse({ success: false, error: 'Tenant account is inactive.' }, 403);
    }
    const tenant = tenantRes.data[0];

    // 7. Check subscription
    const subRes = await supabaseRest(env,
      `subscriptions?tenant_id=eq.${tenantId}&status=eq.active&select=*&order=created_at.desc&limit=1`
    );
    const subscription = subRes.data && subRes.data.length ? subRes.data[0] : null;

    if (!subscription) {
      return jsonResponse({ success: false, error: 'No active subscription found.' }, 403);
    }

    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      return jsonResponse({ success: false, error: 'Subscription has expired.' }, 403);
    }

    // 8. Register or verify device
    let device = null;
    if (hardware_id) {
      // Check if device already registered
      const devRes = await supabaseRest(env,
        `devices?tenant_id=eq.${tenantId}&hardware_id=eq.${encodeURIComponent(hardware_id)}&select=*`
      );

      if (devRes.data && devRes.data.length) {
        device = devRes.data[0];
        // Update last_seen
        await supabaseRest(env, `devices?id=eq.${device.id}`, {
          method: 'PATCH',
          body: { status: 'active', last_seen_at: new Date().toISOString() },
        });
      } else {
        // Check device limit
        const countRes = await supabaseRest(env,
          `devices?tenant_id=eq.${tenantId}&status=neq.inactive&select=id`
        );
        const activeDevices = countRes.data ? countRes.data.length : 0;

        if (activeDevices >= subscription.device_limit) {
          return jsonResponse({
            success: false,
            error: `Device limit reached (${subscription.device_limit}). Upgrade your plan or deactivate another device.`
          }, 403);
        }

        // Register new device
        const newDevRes = await supabaseRest(env, 'devices', {
          method: 'POST',
          body: {
            tenant_id: tenantId,
            device_name: device_name || `Device-${hardware_id.slice(-6)}`,
            hardware_id,
            status: 'active',
            last_seen_at: new Date().toISOString(),
          },
        });
        device = newDevRes.data ? newDevRes.data[0] : null;
      }
    }

    // 9. Get tenant settings
    const settingsRes = await supabaseRest(env,
      `tenant_settings?tenant_id=eq.${tenantId}&select=*`
    );
    const settings = settingsRes.data && settingsRes.data.length ? settingsRes.data[0] : {};

    // 10. Build signed response
    const payload = {
      user_id: userId,
      tenant_id: tenantId,
      tenant_slug: tenant.slug,
      tenant_name: tenant.name,
      role: profile.role,
      device_id: device ? device.id : null,
      plan: subscription.plan,
      subscription_expires_at: subscription.expires_at,
      validated_at: new Date().toISOString(),
    };

    const signature = await hmacSign(LICENSE_SIGNING_SECRET, JSON.stringify(payload));

    return jsonResponse({
      success: true,
      access_token: accessToken,
      refresh_token: authData.refresh_token,
      session: payload,
      settings,
      signature,
    });

  } catch (error) {
    console.error('authenticate-device error:', error);
    return jsonResponse({ success: false, error: 'Internal server error.' }, 500);
  }
}
