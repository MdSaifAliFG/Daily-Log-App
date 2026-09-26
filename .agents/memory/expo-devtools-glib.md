---
name: Expo DevTools GLib warning
description: The optional React Native DevTools binary may warn about missing libglib in this Replit environment.
---

Metro and the Expo preview can still run when the optional React Native DevTools binary reports missing desktop libraries such as GLib, NSS, or DBus.

**Why:** The DevTools binary is optional for the app runtime; treating its startup warning as an app failure leads to chasing a changing desktop-library dependency chain.

**How to apply:** Confirm Metro bundles, the Expo preview renders, and workflow logs show the app running before investigating this warning further. Do not add host libraries unless DevTools itself is required.