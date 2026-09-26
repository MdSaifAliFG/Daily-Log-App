---
name: Mobile API reachability
description: Expo Go development bundles should call the API through the same public Expo host used by the device preview.
---

For Expo Go development, inject `REPLIT_EXPO_DEV_DOMAIN` as the API client base host, with `REPLIT_DEV_DOMAIN` only as a fallback. Add a bounded fetch timeout so offline devices reach an error state instead of loading forever.

**Why:** A phone may open the Expo preview host while being unable to reach a separate Replit domain, even though both work from the workspace container.

**How to apply:** Keep production builds on their injected deployment domain; use the Expo public host only in the development workflow and verify `/api/healthz` and the screen’s data endpoint from that host.