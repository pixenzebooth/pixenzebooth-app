# 📸 PixenzeBooth

[![Vite](https://img.shields.io/badge/Vite-7.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**PixenzeBooth** adalah photobooth online yang bisa diakses langsung dari browser. Tanpa install aplikasi, tanpa ribet. Cukup buka, foto, pilih frame, download. Selesai.

Proyek ini dibuat karena jujur aja, photobooth konvensional itu mahal dan repot. Jadi kenapa nggak bikin versi web-nya yang bisa dipakai siapa aja, kapan aja, gratis?

![PixenzeBooth Preview](docs/preview.png)

---

## 🎯 Kenapa PixenzeBooth?

- **Gratis** — Nggak ada paywall, nggak ada watermark premium.
- **Langsung jalan** — Buka browser, kasih akses kamera, langsung foto.
- **Banyak pilihan frame** — Dari aesthetic minimalis sampai yang colorful banget.
- **Filter foto** — Ada beberapa filter biar foto lo makin kece.
- **Download & Share** — Hasil foto bisa langsung didownload atau dikirim ke email.
- **Mobile-friendly** — Responsive, jadi bisa dipakai dari HP juga.

---

## ✨ Fitur Lengkap

### 🎥 Camera & Capture
- Integrasi webcam langsung dari browser (pakai WebRTC)
- Countdown timer sebelum foto (biar sempet pose dulu)
- Pilihan layout: 3 foto atau 4 foto dalam satu strip
- Flip kamera (front/back) untuk device yang support
- Upload foto dari galeri kalau nggak mau pakai kamera

### 🖼️ Frame System
- Koleksi frame built-in dengan berbagai tema
- Custom frame dari admin panel
- Status frame: Active, Coming Soon, atau Hidden
- Kategori frame: Aesthetic, Vintage, Colorful, dll.
- Sistem "rarity" buat frame-frame spesial

### 🎨 Photo Editing
- Filter foto real-time (Grayscale, Sepia, Vintage, dll.)
- Preview langsung sebelum capture
- Intensitas filter bisa diatur

### 💾 Export & Sharing
- Download hasil foto sebagai gambar PNG
- Kirim hasil foto ke email (via Google Apps Script backend)
- Upload otomatis ke Google Drive (opsional, butuh setup tambahan)

### 🔐 Admin Panel
- Dashboard untuk kelola frame
- CRUD frame: tambah, edit, hapus
- Upload frame baru dengan thumbnail terpisah
- Status management (active/coming_soon/hidden)

### 🎁 Campaign System (Bonus)
- Fitur giveaway "Lucky 10" untuk event
- First-come-first-served winner selection
- Admin dapat start/stop/reset campaign
- Winner list tercatat otomatis

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, Vite 7 |
| **Styling** | Tailwind CSS 4, Framer Motion |
| **Backend/DB** | Supabase (PostgreSQL + Storage) |
| **Routing** | React Router DOM v7 |
| **Security** | Cloudflare Turnstile (anti-bot) |
| **Icons** | Lucide React |
| **SEO** | React Helmet Async |

---

## 📁 Struktur Folder

```
pixenzebooth/
├── public/
│   ├── frames/              # Frame statis built-in
│   └── ...                  # Asset lainnya (logo, manifest, dll)
│
├── src/
│   ├── assets/              # Gambar dan asset yang di-import
│   ├── components/          # Komponen reusable
│   │   ├── CameraView.jsx   # Komponen webcam
│   │   ├── FrameCard.jsx    # Card untuk display frame
│   │   └── ...
│   │
│   ├── context/             # React Context (Alert, dll)
│   ├── hooks/               # Custom hooks
│   │   ├── useAuth.js       # Auth handling
│   │   ├── useCamera.js     # Camera logic
│   │   └── usePhotoBooth.js # State management booth
│   │
│   ├── lib/                 # Config library (Supabase client)
│   ├── pages/               # Halaman utama
│   │   ├── Home.jsx         # Landing page
│   │   ├── Booth.jsx        # Halaman foto
│   │   ├── FrameSelection.jsx
│   │   ├── Result.jsx       # Preview & download
│   │   ├── About.jsx
│   │   ├── Contact.jsx
│   │   └── admin/           # Admin pages
│   │
│   ├── services/            # API calls & external services
│   │   ├── frames.js        # CRUD frames ke Supabase
│   │   ├── googleDriveService.js
│   │   └── campaignService.js
│   │
│   ├── utils/               # Helper functions
│   │   └── imageUtils.js    # Image processing (strip generator)
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css            # Global styles + Tailwind
│
├── supabase_schema.sql      # Database schema
├── campaign_schema.sql      # Schema untuk fitur campaign
├── DEPLOYMENT.md            # Panduan deploy ke Vercel
├── GOOGLE_APPS_SCRIPT.md    # Setup email via Apps Script
└── package.json
```

---

## 🚀 Cara Install & Run

### Prerequisites
- Node.js 18+ 
- Account Supabase (gratis)
- Account Cloudflare (untuk Turnstile, gratis juga)

### Langkah-langkah

1. **Clone repo ini**
   ```bash
   git clone https://github.com/your-username/pixenzebooth.git
   cd pixenzebooth
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   
   Buat file `.env.local` di root folder:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   VITE_TURNSTILE_SITE_KEY=your-turnstile-site-key
   ```

4. **Setup Supabase**
   - Buat project baru di [Supabase](https://supabase.com)
   - Buka SQL Editor, jalankan script dari `supabase_schema.sql`
   - Buat bucket `frames` di Storage, set ke **Public**

5. **Setup Cloudflare Turnstile**
   - Daftar di [Cloudflare](https://www.cloudflare.com/)
   - Buat Turnstile widget untuk domain `localhost` (untuk development)
   - Copy Site Key ke `.env.local`

6. **Jalankan development server**
   ```bash
   npm run dev
   ```
   
   Buka `http://localhost:5173` di browser.

---

## 🌐 Deploy ke Vercel

Cara paling gampang:

```bash
# Login ke Vercel
npx vercel login

# Deploy (preview)
npx vercel

# Deploy production
npx vercel --prod
```

**Jangan lupa** tambahkan environment variables di Vercel Dashboard!

Untuk panduan lengkap, cek file [DEPLOYMENT.md](DEPLOYMENT.md).

---

## 📧 Setup Email (Opsional)

Kalau mau fitur kirim hasil foto ke email:

1. Buat Google Apps Script baru
2. Copy script dari [GOOGLE_APPS_SCRIPT.md](GOOGLE_APPS_SCRIPT.md)
3. Deploy sebagai Web App
4. Masukkan URL Web App ke dalam environment variable

---

## 🗄️ Database Schema

Tabel utama: `frames`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Nama frame |
| image_url | TEXT | URL gambar frame (full) |
| thumbnail_url | TEXT | URL thumbnail (opsional) |
| status | VARCHAR | active / coming_soon / hidden |
| style | VARCHAR | Kategori style |
| rarity | VARCHAR | Common / Rare / Epic / Legendary |
| artist | VARCHAR | Kreator frame |
| type | VARCHAR | default / custom |
| layout_config | JSONB | Config layout foto |
| created_at | TIMESTAMP | Waktu dibuat |

---

## 🤝 Kontributor

<table>
  <tr>
    <td align="center">
      <a href="https://instagram.com/nandaaddiwijaya">
        <img src="public/nanda-profile.jpg" width="100px;" alt="Nanda"/><br />
        <sub><b>Nanda Addi Wijaya</b></sub>
      </a>
      <br />
      <sub>Creator & Developer</sub>
    </td>
  </tr>
</table>

Tertarik kontribusi? Feel free buat open issue atau pull request. Semua kontribusi diapresiasi!

---

## 📝 License

Project ini menggunakan MIT License. Silakan dipakai, dimodifikasi, atau didistribusikan.

---

## 💡 Roadmap (Coming Soon)

- [ ] Multiple frame overlay dalam satu session
- [ ] Sticker support
- [ ] Text/caption editor
- [ ] Social media direct share (IG Story, Twitter)
- [ ] PWA support (installable app)
- [ ] Multi-language support

---

## 🙏 Special Thanks

- [Supabase](https://supabase.com) — Backend yang powerful dan gratis
- [Vercel](https://vercel.com) — Hosting yang cepat dan mudah
- [Tailwind CSS](https://tailwindcss.com) — Styling tanpa ribet
- [Framer Motion](https://www.framer.com/motion/) — Animasi yang smooth
- Semua yang udah nyoba dan kasih feedback!

---

<p align="center">
  Made with ☕ and late-night coding sessions
  <br/>
  <a href="https://pixenzebooth.vercel.app">pixenzebooth.vercel.app</a>
</p>
