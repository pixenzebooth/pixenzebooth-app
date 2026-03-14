# Panduan Deployment ke Vercel

Berikut adalah langkah-langkah untuk men-deploy aplikasi PixenzeBooth ke Vercel.

## Metode 1: Menggunakan Vercel CLI (Direkomendasikan)

Ini adalah cara tercepat untuk men-deploy langsung dari terminal.

1.  **Login ke Vercel**
    Jalankan perintah berikut di terminal:
    ```bash
    npx vercel login
    ```
    Ikuti instruksi untuk login menggunakan email atau akun GitHub/GitLab/Bitbucket Anda.

2.  **Deploy Project**
    Setelah login, jalankan perintah:
    ```bash
    npx vercel
    ```
    
    Jawab pertanyaan konfigurasi seperti berikut:
    - *Set up and deploy?* **Y**
    - *Which scope?* (Pilih akun Anda)
    - *Link to existing project?* **N** (kecuali Anda sudah pernah deploy ini sebelumnya)
    - *Project name?* **pixenze-booth** (atau nama yang Anda inginkan)
    - *In which directory?* **./** (tekan Enter)
    - *Want to modify these settings?* **N** (Vite biasanya terdeteksi otomatis)

3.  **Environment Variables (PENTING)**
    Karena aplikasi ini menggunakan Supabase dan Turnstile, Anda WAJIB menambahkan environment variables ke Vercel.
    
    Anda bisa melakukannya lewat Dashboard Vercel setelah project terbuat, ATAU saat proses deploy CLI jika ditanya.
    
    Variabel yang harus dimasukkan (Salin dari `.env.local`):
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
    - `VITE_TURNSTILE_SITE_KEY`

4.  **Deploy Production**
    Perintah `npx vercel` di atas hanya men-deploy "Preview". Untuk men-deploy ke domain utama (Production), gunakan:
    ```bash
    npx vercel --prod
    ```

---

## Metode 2: Melalui Dashboard Vercel (Integrasi GitHub)

Jika Anda sudah push kode ini ke GitHub:

1.  Buka [Vercel Dashboard](https://vercel.com/dashboard).
2.  Klik **"Add New..."** > **"Project"**.
3.  Pilih repository GitHub `pixenze-booth` Anda lalu klik **Import**.
4.  Di bagian **Environment Variables**, masukkan key-value pair sesuai isi file `.env.local` Anda.
5.  Klik **Deploy**.

## Catatan Penting

- **Site Key Turnstile**: Pastikan Anda membuat Site Key baru di Cloudflare untuk domain Vercel Anda (misal: `pixenze-booth.vercel.app`). Key yang `localhost` mungkin memberi warning atau tidak bekerja di production.
- **Supabase URL**: Pastikan URL Supabase Anda valid dan database Anda bisa diakses dari public (karena RLS sudah diatur).
