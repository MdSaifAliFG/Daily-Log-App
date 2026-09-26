---
name: Appearance API web compatibility
description: React Native Web does not provide Appearance.setColorScheme; native appearance updates need a platform guard.
---

Guard `Appearance.setColorScheme` with a non-web platform check before calling it. On native, use `light`, `dark`, or `unspecified` to restore the system scheme.

**Why:** React Native Web renders the Settings switch but throws when the native-only method is invoked.

**How to apply:** Keep theme tokens and `useColorScheme` as the web fallback; only call the native appearance setter on iOS or Android.