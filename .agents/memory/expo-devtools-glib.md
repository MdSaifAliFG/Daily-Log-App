---
name: Expo DevTools GLib warning
description: The optional React Native DevTools binary may warn about missing libglib in this Replit environment.
---

Metro and the Expo preview can still run when React Native DevTools reports that `libglib-2.0.so.0` is unavailable.

**Why:** The DevTools binary is optional for the app runtime; treating its startup warning as an app failure leads to unnecessary dependency changes.

**How to apply:** Confirm Metro bundles, the Expo preview renders, and workflow logs show the app running before investigating this warning further.