# 🚀 Vercel Deployment Setup Guide

## ⚠️ CRITICAL: Environment Variables Required

Your app is deployed but **missing environment variables**! This is why you're getting errors.

---

## 📋 Step-by-Step Fix

### 1️⃣ Get Your Supabase Keys

1. Open: **https://supabase.com/dashboard/project/oftnqwmvcpwzsaeajrns/settings/api**
2. Copy these two values:
   - **Project URL** (starts with `https://oftnqwmvcpwzsaeajrns.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)

---

### 2️⃣ Add Environment Variables to Vercel

1. **Open your Vercel project settings:**
   - Go to: https://vercel.com/dashboard
   - Click on your project: `saknak-home-hub-22338`
   - Click **"Settings"** tab
   - Click **"Environment Variables"** in the left sidebar

2. **Add these two variables:**

   **Variable 1:**
   ```
   Name:  VITE_SUPABASE_URL
   Value: https://oftnqwmvcpwzsaeajrns.supabase.co
   ```
   - Environment: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

   **Variable 2:**
   ```
   Name:  VITE_SUPABASE_PUBLISHABLE_KEY
   Value: [paste your anon key from step 1]
   ```
   - Environment: ✅ Production ✅ Preview ✅ Development
   - Click **"Save"**

---

### 3️⃣ Redeploy Your Site

After adding environment variables:

**Option A: Via Vercel Dashboard**
1. Go to **"Deployments"** tab
2. Click the **"..."** menu on the latest deployment
3. Click **"Redeploy"**
4. Wait 1-2 minutes

**Option B: Push to GitHub (I'll do this for you)**
```bash
git commit --allow-empty -m "trigger redeploy"
git push origin main
```

---

## ✅ After Redeployment

Your site will work perfectly:
- ✅ Login will work
- ✅ Booking apartments will work
- ✅ Maps will display correctly
- ✅ All features functional

---

## 🔍 How to Verify It's Fixed

1. Open: https://saknak-home-hub.vercel.app/
2. Try to login - should work!
3. Try to view a property on map - should work!
4. Try to book an apartment - should work!

---

## 🛠️ Troubleshooting

If it still doesn't work after adding environment variables:

1. **Check the browser console** (F12) for errors
2. **Verify variables are set** in Vercel → Settings → Environment Variables
3. **Make sure you redeployed** after adding variables
4. **Clear browser cache** and try again

---

## 📞 Need Help?

If you're still seeing errors, tell me:
1. What error message you see
2. When it happens (login, booking, map, etc.)
3. Screenshot of browser console (F12 → Console tab)

