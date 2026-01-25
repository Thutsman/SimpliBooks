# SimpliBooks Setup Guide

This guide will help you set up SimpliBooks from scratch.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create Supabase Project

1. Go to [Supabase](https://supabase.com) and sign in
2. Click "New Project"
3. Enter a project name (e.g., "simplibooks")
4. Set a secure database password (save this!)
5. Select a region close to your users
6. Click "Create new project"
7. Wait for the project to be created (takes 1-2 minutes)

## Step 3: Get Your API Keys

1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (a long JWT string)

## Step 4: Configure Environment Variables

1. Copy the example env file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 5: Run Database Migrations

1. In your Supabase project, go to **SQL Editor**
2. Click "New query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Repeat for `supabase/migrations/002_rls_policies.sql`

Alternatively, use the Supabase CLI:
```bash
npx supabase db push
```

## Step 6: Enable Email Authentication

1. Go to **Authentication** → **Providers**
2. Email provider should be enabled by default
3. Configure email templates in **Authentication** → **Email Templates** (optional)

## Step 7: (Optional) Enable Google OAuth

1. Go to **Authentication** → **Providers**
2. Click on "Google" to expand
3. Toggle "Enable Sign in with Google"
4. You'll need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select existing
   - Go to **APIs & Services** → **Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
   - Copy the Client ID and Client Secret
5. Paste the credentials in Supabase Google provider settings
6. Save

## Step 8: Start Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Step 9: Create Your First Account

1. Open the app in your browser
2. Click "Start Free Trial" or "Sign Up"
3. Enter your email and password
4. Check your email for verification (if enabled)
5. Log in and create your first company

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Environment Variables for Production

Make sure to update your Supabase project settings:

1. In Supabase, go to **Authentication** → **URL Configuration**
2. Update **Site URL** to your production URL (e.g., `https://myapp.vercel.app`)
3. Add your production URL to **Redirect URLs**

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure you've created `.env` file with the correct values
- Restart the development server after changing env variables

### "Invalid API key" or authentication errors
- Double-check your Supabase URL and anon key
- Make sure you're using the "anon public" key, not the service role key

### Google OAuth not working
- Verify redirect URL is exactly: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- Check that Google OAuth is enabled in Supabase
- Make sure Google Cloud OAuth consent screen is configured

### Database errors
- Run the migration SQL files in order
- Check that RLS policies were created successfully
- Verify you have the correct permissions

## Support

For issues or questions, please open a GitHub issue.
