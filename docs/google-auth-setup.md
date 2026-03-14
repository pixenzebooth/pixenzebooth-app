# How to Set Up Google Authentication for Sparkle Booth

To enable the "Login with Google" feature, you need to connect your Supabase project to a Google Cloud project. Follow these steps:

## Step 1: Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top left and select **"New Project"**.
3. Name it `Sparkle Booth` (or anything you like) and click **Create**.
4. Select the newly created project.

## Step 2: Configure OAuth Consent Screen
1. In the left menu, go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** (unless you have a G-Suite organization, but External is standard for public apps) and click **Create**.
3. Fill in the required app information:
   - **App Name**: Sparkle Booth
   - **User Support Email**: Select your email.
   - **Developer Contact Information**: Enter your email.
4. Click **Save and Continue** (you can skip "Scopes" and "Test Users" for now by just clicking Save and Continue).
5. On the Summary page, click **Back to Dashboard**.

## Step 3: Create Credentials
1. In the left menu, click **Credentials**.
2. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
3. **Application type**: Select **Web application**.
4. **Name**: `Supabase Auth` (or similar).
5. **Authorized JavaScript origins**:
   - Add your local development URL: `http://localhost:5173` (or whatever port you are using).
   - *Later, when you publish your site, you will add your production URL here.*
6. **Authorized redirect URIs**:
   - You need to get this URL from Supabase.
   - Go to your **Supabase Dashboard** > **Authentication** > **Providers** > **Google**.
   - Copy the **Callback URL** (it looks like `https://<project-ref>.supabase.co/auth/v1/callback`).
   - Paste that URL here in Google Cloud Console.
7. Click **Create**.

## Step 4: Link to Supabase
1. You will now see a popup with **"Your Client ID"** and **"Your Client Secret"**.
2. Copy the **Client ID**.
3. Go back to your **Supabase Dashboard** > **Authentication** > **Providers** > **Google**.
4. Paste the Client ID into the **Client ID** field.
5. Copy the **Client Secret** from Google Cloud Console.
6. Paste it into the **Client Secret** field in Supabase.
7. Click **Save**.

## Step 5: Test It!
1. Restart your Sparkle Booth app (`npm run dev`).
2. Click the **Login** button.
3. It should now pop up the Google Login screen!

---

*Note: Changes in Google Cloud Console can sometimes take a few minutes to propagate.*
