# 🚨 CRITICAL: Fix Vercel Environment Variables

## The Problem
Your Vercel deployment is missing Supabase environment variables, causing all API calls to fail.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Get Your Supabase Credentials

1. Go to: **https://supabase.com/dashboard/project/oftnqwmvcpwzsaeajrns/settings/api**
2. Copy these two values:
   - **Project URL** (should be: `https://oftnqwmvcpwzsaeajrns.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

---

### Step 2: Add to Vercel

1. **Open Vercel Dashboard:**
   - Go to: https://vercel.com/dashboard
   - Click your project: `saknak-home-hub-22338`
   - Click **"Settings"** tab
   - Click **"Environment Variables"** in left sidebar

2. **Add Variable 1:**
   ```
   Name:  VITE_SUPABASE_URL
   Value: https://oftnqwmvcpwzsaeajrns.supabase.co
   ```
   - Check: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

3. **Add Variable 2:**
   ```
   Name:  VITE_SUPABASE_PUBLISHABLE_KEY
   Value: [paste your anon key here - the long eyJ... string]
   ```
   - Check: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

---

### Step 3: Redeploy

After adding both variables:

**Option A: Via Dashboard**
1. Go to **Deployments** tab
2. Click **"..."** on latest deployment
3. Click **"Redeploy"**

**Option B: I'll trigger it for you**
Just say "redeploy now" and I'll push a commit to trigger it.

---

## 🔍 How to Verify

After redeployment:
1. Open: https://saknak-home-hub.vercel.app/
2. Open browser console (F12)
3. Should NOT see environment variable errors
4. Login should work
5. Booking should work

---

## 📝 Notes

- These environment variables are **required** for your app to connect to Supabase
- Without them, nothing works (login, booking, database access)
- The variables must start with `VITE_` for Vite to expose them to the browser
- Your correct Supabase project ID is: **oftnqwmvcpwzsaeajrns**


