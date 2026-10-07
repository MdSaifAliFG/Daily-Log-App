# 🌿 Daily Log App

A reflection, habit tracking, and journaling application built with **React Native / Expo Router**, **Supabase Backend** (Auth + PostgreSQL with Row-Level Security), and an **Offline-First Resilience Architecture** (AsyncStorage).

---

## ✨ Features & Architecture

- **🎨 Warm & Premium Aesthetic**:
  - Terracotta, soft sage green, and warm paper card styling.
  - Dedicated custom app icon and logo assets (`assets/images/logo.png`).
  - Dark mode and light mode support with fluid transitions.

- **🚀 Landing Page & Onboarding**:
  - Welcoming hero screen displaying the app logo, feature overview, and value proposition.
  - Seamless "Sign In / Create Account" modal with email & password validation.
  - One-tap "Continue as Guest" for instant, zero-friction local journaling.

- **🔐 Supabase Authentication & Backend**:
  - Real-time Supabase session management (`AuthContext`).
  - Row Level Security (RLS) guaranteeing private user data.
  - Automated user profile trigger and 5 starter routines seeded on sign-up.
  - Complete schema script provided in [`supabase_schema.sql`](file:///c:/Daily-Log-App/supabase_schema.sql).

- **📱 Zero-Crash Offline Resilience**:
  - If Supabase credentials are not provided or the device is offline, the app automatically persists and reads everything from local `AsyncStorage`.
  - No network error screens or blocked interfaces on mobile devices.

- **⚙️ Dynamic In-App Supabase Key Configuration**:
  - Configure Supabase credentials directly within the app (Settings → "Supabase Backend" → "Configure"), saving keys instantly without rebuilding or reinstalling the APK!
  - Or configure them statically via `.env` (`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`).

- **📅 Core Reflection Loops**:
  - **Today**: Daily thoughts with auto-save, 1-5 mood check-in, top 3 priorities, routine checklist, and previous day snippets.
  - **Week**: 7-day completion rhythm bar chart, daily summaries, and weekly reflections ("What gave you energy?", "What to adjust?").
  - **Month**: Calendar heat grid, routine rhythm %, average mood, and streak tracking.
  - **Routines**: Manage and pause daily anchors (morning meditation, restful sleep, deep work blocks, etc.).

---

## 🛠️ Supabase Setup (3 Quick Steps)

1. **Create Project**: Go to [supabase.com](https://supabase.com) and create a free project.
2. **Run SQL Schema**:
   - In your Supabase dashboard, click **SQL Editor**.
   - Copy and paste the entire contents of [`supabase_schema.sql`](file:///c:/Daily-Log-App/supabase_schema.sql).
   - Click **Run**.
3. **Get API Keys**:
   - In Supabase, go to **Project Settings** → **API**.
   - Copy your **Project URL** and **anon public key**.
   - **Option A (In-App)**: Open the Daily Log app, go to **Settings** → **Supabase Backend** → **Configure**, paste your URL and anon key, and tap **Save & Connect**.
   - **Option B (.env)**: Paste into `.env` and `artifacts/daily-log/.env`:
     ```env
     EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
     ```

---

## 🚀 Running Commands

### 1. Web Preview (Local Test in Browser)
To preview the app instantly in your browser:
```powershell
pnpm run dev:app:web
```
Or to serve the optimized production build:
```powershell
pnpm run preview:app
```
*Accessible at [http://localhost:8081](http://localhost:8081)*

### 2. Expo Go (Test on Real Mobile Device)
To test on your iPhone or Android phone via Expo Go:
```powershell
pnpm run dev:app
```
*(Scan the generated QR code using the Expo Go app on Android or Camera app on iOS)*.

To test across different Wi-Fi networks via tunnel:
```powershell
pnpm run dev:app:tunnel
```

### 3. Build Standalone Android APK
To compile and download a standalone `.apk` directly to your phone:
```powershell
pnpm run build:apk
```
*(Runs EAS Cloud build. When finished, Expo will output a direct download link and QR code to install the APK directly on Android without an emulator or Android Studio)*.

---

## 🔍 Codebase Quality & Validation

- Full TypeScript validation:
  ```powershell
  pnpm run check
  ```
  *(Verified with 0 errors)*
- Production bundle export:
  ```powershell
  pnpm run build
  ```
  *(Verified static web export succeeds cleanly)*
