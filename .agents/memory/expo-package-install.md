---
name: Expo package installation
description: Native Expo dependencies must be installed from the artifact package directory in this workspace.
---

Install Expo-specific packages from the mobile artifact directory rather than the workspace root.

**Why:** Root-level pnpm add is blocked by the workspace root check and does not attach the dependency to the Expo package.

**How to apply:** Run the package install with the working directory set to `artifacts/<mobile-artifact>` so the dependency lands in that artifact's package manifest.