# How to Deploy to Cloudflare Pages

Since this is a Single Page Application (SPA) using React Router, we need to ensure Cloudflare handles routing correctly.

**I have already created the necessary `public/_redirects` file for you.**

## Method A: Git Integration (Recommended)
This is the best way as it automatically redeploys when you push changes to GitHub/GitLab.

1.  **Push your code** to a GitHub or GitLab repository.
2.  Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
3.  Go to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
4.  Select your repository.
5.  **Build Settings**:
    *   **Framework preset**: `Vite`
    *   **Build command**: `npm run build`
    *   **Output directory**: `dist`
6.  **Environment Variables**:
    *   Add your Supabase keys here!
    *   `Vite_SUPABASE_URL`: (Your URL)
    *   `VITE_SUPABASE_ANON_KEY`: (Your Key)
7.  Click **Save and Deploy**.

## Method B: Direct Upload (Drag & Drop)
If you don't want to use Git, you can upload the built files directly.

1.  Run the build command locally:
    ```bash
    npm run build
    ```
2.  This creates a `dist` folder in your project directory.
3.  Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
4.  Go to **Workers & Pages** > **Create application** > **Pages** > **Upload Assets**.
5.  Drag and drop the `dist` folder.
6.  **Note**: You cannot set Environment Variables easily this way unless you hardcode them in your code (not recommended) or use Wrangler CLI.

## Method C: Wrangler CLI (Advanced)
If you have `wrangler` installed and authenticated:

```bash
npx wrangler pages deploy dist --project-name sparkle-booth
```
