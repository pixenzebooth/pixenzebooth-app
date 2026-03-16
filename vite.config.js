import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Local API middleware plugin for development
// Emulates Cloudflare Functions locally so /api/create-qris works with `npm run dev`

function localApiPlugin() {
  return {
    name: 'local-api-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/create-qris' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              if (!body) throw new Error('No body received');

              const data = JSON.parse(body);
              const { name, message, amount, email } = data;

              const merchantCode = env.BAGIBAGI_MERCHANT_CODE;
              const apiKey = env.BAGIBAGI_API_KEY;
              const webhookUrl = env.BAGIBAGI_WEBHOOK_URL || 'https://pixenzebooth.com/api/payment-callback';

              if (!merchantCode || !apiKey) {
                throw new Error('Missing BAGIBAGI_MERCHANT_CODE or BAGIBAGI_API_KEY in .env');
              }

              // MD5 signature (same logic as Cloudflare Worker)
              const rawString = `${name}${message}${amount}${email}${webhookUrl}${merchantCode}${apiKey}`;
              const token = crypto.createHash('md5').update(rawString).digest('hex');

              const payload = { name, message, amount, email, merchantCode, token, webhookUrl };

              const apiRes = await fetch('https://bagibagi.co/api/partnerintegration/create-qris-transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });

              const apiData = await apiRes.json();

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = apiRes.status;
              res.end(JSON.stringify(apiData));

            } catch (e) {
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
        } else if (req.url === '/api/midtrans-qr' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              if (!body) throw new Error('No body received');
              const data = JSON.parse(body);
              const { amount, orderId, name, email } = data;

              const serverKey = env.VITE_MIDTRANS_SERVER_KEY || env.MIDTRANS_SERVER_KEY;
              if (!serverKey) throw new Error('Missing MIDTRANS_SERVER_KEY or VITE_MIDTRANS_SERVER_KEY in .env');

              // Auto-detect if it's production or sandbox if not explicitly set
              let isProduction = (env.VITE_MIDTRANS_IS_PRODUCTION || env.MIDTRANS_IS_PRODUCTION) === 'true';
              if (env.VITE_MIDTRANS_IS_PRODUCTION === undefined && env.MIDTRANS_IS_PRODUCTION === undefined) {
                isProduction = serverKey.startsWith('Mid-server-');
              }

              const url = isProduction ? 'https://api.midtrans.com/v2/charge' : 'https://api.sandbox.midtrans.com/v2/charge';
              const authString = Buffer.from(`${serverKey}:`).toString('base64');

              const payload = {
                payment_type: "qris",
                transaction_details: {
                  order_id: orderId || `PX-${Date.now()}`,
                  gross_amount: Math.floor(Number(amount))
                },
                customer_details: { first_name: name || "Pixenze", email: email || "hello@pixenze.com" }
              };

              console.log("Calling Midtrans API:", url, "with payload:", JSON.stringify(payload));
              const apiRes = await fetch(url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': `Basic ${authString}`
                },
                body: JSON.stringify(payload)
              });

              const rawResponse = await apiRes.text();
              console.log("[Midtrans] Raw Response:", rawResponse);

              let apiData;
              try {
                apiData = JSON.parse(rawResponse);
              } catch (e) {
                throw new Error(`Midtrans returned non-JSON: ${rawResponse}`);
              }

              if (!apiRes.ok || (apiData.status_code && apiData.status_code !== "201")) {
                throw new Error(apiData.status_message || apiData.message || JSON.stringify(apiData));
              }

              const action = apiData.actions?.find(a => a.name === "generate-qr-code");

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, order_id: apiData.order_id, qr_url: action ? action.url : null }));
            } catch (e) {
              console.error("Vite Proxy Error [/api/midtrans-qr]:", e.message);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({
                success: false,
                message: e.message,
                debug: "Liat terminal hitam (npm run dev) untuk melihat [Midtrans] Raw Response yang asli!"
              }));
            }
          });
        } else if (req.url.startsWith('/api/midtrans-status') && req.method === 'GET') {
          const env = loadEnv('development', process.cwd(), '');
          try {
            const urlObj = new URL(req.url, `http://${req.headers.host}`);
            const orderId = urlObj.searchParams.get('order_id');

            if (!orderId) throw new Error('Missing order_id');

            const serverKey = env.MIDTRANS_SERVER_KEY;
            let isProduction = env.MIDTRANS_IS_PRODUCTION === 'true';
            if (!env.MIDTRANS_IS_PRODUCTION) {
              isProduction = serverKey.startsWith('Mid-server-');
            }
            const url = isProduction ? `https://api.midtrans.com/v2/${orderId}/status` : `https://api.sandbox.midtrans.com/v2/${orderId}/status`;
            const authString = Buffer.from(`${serverKey}:`).toString('base64');

            const apiRes = await fetch(url, {
              method: 'GET',
              headers: { 'Accept': 'application/json', 'Authorization': `Basic ${authString}` }
            });

            const apiData = await apiRes.json();
            res.setHeader('Content-Type', 'application/json');
            if (apiRes.ok && (apiData.status_code === "200" || apiData.status_code === "201")) {
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, transaction_status: apiData.transaction_status }));
            } else {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, message: 'Status query failed', detail: apiData }));
            }
          } catch (e) {
            console.error("Vite Proxy Error [/api/midtrans-status]:", e);
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, message: e.message, stack: e.stack }));
          }
        } else if (req.url === '/api/get-local-ip' && req.method === 'GET') {
          const interfaces = Object.values(os.networkInterfaces());
          let localIp = '127.0.0.1';
          for (let iface of interfaces) {
            for (let alias of iface) {
              if (alias.family === 'IPv4' && !alias.internal) {
                localIp = alias.address;
                break;
              }
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            ip: localIp
          }));
        } else if (req.url === '/api/upload-media' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');
          const chunks = [];

          req.on('data', chunk => chunks.push(chunk));
          req.on('end', async () => {
            try {
              const body = Buffer.concat(chunks).toString();
              const { photo, video, gif } = JSON.parse(body);
              const sessionId = Date.now().toString() + Math.floor(Math.random() * 1000);
              const ext = video && video.includes('video/mp4') ? 'mp4' : 'webm';

              const accountId = env.VITE_R2_ACCOUNT_ID || env.R2_ACCOUNT_ID;
              const accessKeyId = env.VITE_R2_ACCESS_KEY_ID || env.R2_ACCESS_KEY_ID;
              const secretAccessKey = env.VITE_R2_SECRET_ACCESS_KEY || env.R2_SECRET_ACCESS_KEY;
              const bucketName = env.VITE_R2_BUCKET_NAME || env.R2_BUCKET_NAME;

              // Validate base64 strings
              const getBufferAndMime = (base64Str) => {
                if (!base64Str) return null;
                const matches = base64Str.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                if (!matches || matches.length !== 3) return null;
                return { mime: matches[1], buffer: Buffer.from(matches[2], 'base64') };
              };

              const photoObj = getBufferAndMime(photo);
              const videoObj = getBufferAndMime(video);
              const gifObj = getBufferAndMime(gif);

              if (accountId && accessKeyId && secretAccessKey && bucketName) {
                // Upload to Cloudflare R2
                const s3 = new S3Client({
                  region: 'auto',
                  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
                  credentials: { accessKeyId, secretAccessKey }
                });

                const uploadToR2 = async (obj, filename) => {
                  if (!obj) return;
                  await s3.send(new PutObjectCommand({
                    Bucket: bucketName,
                    Key: filename,
                    Body: obj.buffer,
                    ContentType: obj.mime
                  }));
                };

                await Promise.all([
                  uploadToR2(photoObj, `${sessionId}_photo.jpg`),
                  uploadToR2(videoObj, `${sessionId}_video.${ext}`),
                  uploadToR2(gifObj, `${sessionId}_gif.gif`)
                ]);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, sessionId, ext, r2: true }));
              } else {
                // Fallback local save if R2 credentials not provided
                const tempDir = path.join(process.cwd(), 'public', 'temp_media');
                if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

                const saveLocal = (obj, filename) => {
                  if (!obj) return null;
                  fs.writeFileSync(path.join(tempDir, filename), obj.buffer);
                  return filename;
                };

                saveLocal(photoObj, `${sessionId}_photo.jpg`);
                saveLocal(videoObj, `${sessionId}_video.${ext}`);
                saveLocal(gifObj, `${sessionId}_gif.gif`);

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, sessionId, ext, r2: false }));
              }
            } catch (e) {
              console.error("Upload error:", e);
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, message: e.message }));
            }
          });
        } else if (req.url === '/api/signed-upload-url' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { event_id, filename, content_type, tenant_id, session_id, tier, category } = JSON.parse(body);
              const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
              const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
              const authHeader = req.headers.authorization;

              if (!authHeader) throw new Error('Unauthorized');
              
              const photoId = crypto.randomUUID();
              // Use the provided filename as the base if available to allow predictable naming for related assets
              const ext = filename ? filename.split('.').pop() : 'jpg';
              // Use session_id as the folder name if provided, otherwise use the photo's base name
              const sessionIdStr = session_id || (filename ? filename.split('.').slice(0, -1).join('.') : photoId);
              const tenantStr = tenant_id || 'default';
              const eventStr = event_id || 'general';
              const tierStr = tier || 'cold'; // Default to cold for safety
              const categoryStr = category || 'gallery'; // Suggestion 5: Functional categories
              
              // ORGANIZED PATH STRUCTURE (Suggestion 4 & 5):
              // {category} / {tier} / {tenant} / {event} / {session} / {file}
              const filePath = `${categoryStr}/${tierStr}/${tenantStr}/${eventStr}/${sessionIdStr}/${filename || `${photoId}.jpg`}`;

              // R2 check
              const r2AccessKey = env.R2_ACCESS_KEY_ID || env.VITE_R2_ACCESS_KEY_ID;
              const r2SecretKey = env.R2_SECRET_ACCESS_KEY || env.VITE_R2_SECRET_ACCESS_KEY;
              const r2Endpoint = env.R2_ENDPOINT || env.VITE_R2_ENDPOINT;
              const r2Bucket = env.R2_BUCKET_NAME || env.VITE_R2_BUCKET_NAME;

              if (r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket) {
                const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
                const s3 = new S3Client({
                  region: 'auto',
                  endpoint: r2Endpoint,
                  credentials: { accessKeyId: r2AccessKey, secretAccessKey: r2SecretKey }
                });

                const command = new PutObjectCommand({
                  Bucket: r2Bucket,
                  Key: filePath,
                  ContentType: content_type || 'image/jpeg'
                });

                const signedUrl = await getSignedUrl(s3, command, { expiresIn: 600 });
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  photo_id: photoId,
                  file_path: filePath,
                  upload_url: signedUrl,
                  method: 'PUT',
                  storage_provider: 'r2'
                }));
              } else {
                // Fallback: Use standard Supabase Upload URL (Direct)
                // In dev, we just return the public target and tell client to use POST with apikey
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  success: true,
                  photo_id: photoId,
                  file_path: filePath,
                  upload_url: `${supabaseUrl}/storage/v1/object/photos/${filePath}`,
                  upload_headers: {
                    apikey: env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
                    Authorization: authHeader,
                    'x-upsert': 'true'
                  },
                  method: 'POST',
                  storage_provider: 'supabase'
                }));
              }
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
        } else if (req.url === '/api/confirm-upload' && req.method === 'POST') {
          const env = loadEnv('development', process.cwd(), '');
          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const { photo_id, event_id, file_path, file_size, storage_provider } = JSON.parse(body);
              const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
              const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
              const r2PublicUrl = env.R2_PUBLIC_URL || env.VITE_R2_PUBLIC_URL;

              let publicUrl;
              if (storage_provider === 'r2' && r2PublicUrl) {
                publicUrl = `${r2PublicUrl.replace(/\/$/, '')}/${file_path}`;
              } else {
                publicUrl = `${supabaseUrl}/storage/v1/object/public/photos/${file_path}`;
              }

              // Just a dummy simulation for dev unless we want to actually hit Supabase
              // Let's actually hit Supabase so the DB updates!
              const insertRes = await fetch(`${supabaseUrl}/rest/v1/photos`, {
                method: 'POST',
                headers: {
                  apikey: supabaseServiceKey,
                  Authorization: `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                  Prefer: 'return=representation'
                },
                body: JSON.stringify({
                  id: photo_id,
                  event_id,
                  photo_url: publicUrl,
                  file_path,
                  file_size: file_size || 0
                })
              });

              if (!insertRes.ok) {
                 const errText = await insertRes.text();
                 console.error("DB Insert Error:", errText);
                 // Even if DB fails, we return success in dev to keep flow moving, but log it
              }

              const data = await insertRes.json().catch(() => ({}));
              
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                photo: data[0] || { id: photo_id, photo_url: publicUrl, file_path, created_at: new Date().toISOString() } 
              }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: e.message }));
            }
          });
        } else if (req.url === '/api/validate-license' && req.method === 'POST') {
          // ==========================================
          // Secure License Validation (Dev Proxy)
          // Mirrors the Cloudflare Function logic
          // ==========================================
          const env = loadEnv('development', process.cwd(), '');

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              if (!body) throw new Error('No body received');
              const data = JSON.parse(body);
              const { key } = data;

              if (!key || typeof key !== 'string' || key.trim().length < 4) {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 400;
                res.end(JSON.stringify({ valid: false, error: 'License key is required' }));
                return;
              }

              const trimmedKey = key.trim().toUpperCase();
              const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
              const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
              const signingSecret = env.LICENSE_SIGNING_SECRET || 'dev-signing-secret-change-in-production';

              if (!supabaseUrl || !supabaseServiceKey) {
                throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
              }

              // Query Supabase with service role key
              const queryUrl = `${supabaseUrl}/rest/v1/licenses?license_key=eq.${encodeURIComponent(trimmedKey)}&select=id,license_key,owner_name,owner_email,plan,expires_at,activated_at,is_active,max_activations,activation_count`;
              const supabaseRes = await fetch(queryUrl, {
                headers: {
                  apikey: supabaseServiceKey,
                  Authorization: `Bearer ${supabaseServiceKey}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!supabaseRes.ok) {
                throw new Error(`Supabase query failed: ${await supabaseRes.text()}`);
              }

              const rows = await supabaseRes.json();

              if (!rows || rows.length === 0) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: 'Invalid or expired license' }));
                return;
              }

              const license = rows[0];

              if (!license.is_active) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: 'License has been deactivated' }));
                return;
              }

              const now = new Date();
              if (new Date(license.expires_at) < now) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: 'License has expired' }));
                return;
              }

              // Build signed payload
              const payload = {
                id: license.id,
                owner_name: license.owner_name,
                owner_email: license.owner_email,
                plan: license.plan,
                expires_at: license.expires_at,
                activated_at: license.activated_at,
                validated_at: now.toISOString(),
              };

              // HMAC signature using crypto
              const payloadStr = JSON.stringify(payload);
              const signature = crypto.createHmac('sha256', signingSecret).update(payloadStr).digest('hex');

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ valid: true, license: payload, signature }));
            } catch (e) {
              console.error("Vite Proxy Error [/api/validate-license]:", e.message);
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 500;
              res.end(JSON.stringify({ valid: false, error: e.message }));
            }
          });
        } else {
          next();
        }
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    localApiPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo.jpg', 'manifest.json'],
      manifest: false, // Use existing manifest.json in public folder
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,json}'],
        globIgnores: ['**/temp_media/**/*'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10MB
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Don't let the SW intercept API calls or external resources
        navigateFallbackDenylist: [/^\/api\//],
        // Runtime caching for manifest.json with network-first strategy
        runtimeCaching: [
          {
            urlPattern: /\/manifest\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'manifest-cache',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 86400, // 24 hours
              },
            },
          },
        ],
      }
    })
  ],
  build: {
    // Code splitting configuration
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Animation library (loaded separately since it's large)
          motion: ['framer-motion'],
          // UI utilities
          ui: ['lucide-react', 'clsx', 'tailwind-merge'],
          // Supabase (loaded separately for pages that need it)
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Sourcemaps in production (hidden for Sentry upload)
    sourcemap: 'hidden',
    // Asset size optimization
    assetsInlineLimit: 4096, // Inline assets smaller than 4KB
  },
  // Optimize dependencies
  optimizeDeps: {
    entries: ['index.html'],
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
