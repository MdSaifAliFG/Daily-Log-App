---
name: Generated client typecheck
description: Orval's fetch client uses Headers.entries(), so the shared client package needs iterable DOM typings.
---

The generated React client depends on `dom.iterable` typings in addition to `dom`.

**Why:** The generated fetch helper calls `Headers.entries()`, which TypeScript does not expose with only the base DOM library.

**How to apply:** Keep `dom.iterable` in the shared API client's TypeScript `lib` list when regenerating API hooks.