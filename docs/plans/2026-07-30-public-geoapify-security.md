# Public Geoapify Security Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep the Geoapify API key out of public GitHub and browser assets while reducing abuse of the public search proxy.

**Architecture:** The browser continues to call a same-origin endpoint without credentials. Vite handles local development, while the generated Sites Worker reads the production key only from `env.GEOAPIFY_API_KEY`; both proxies validate a small parameter contract. The production Worker adds per-client rate limiting, bounded response caching, and upstream timeouts, while a repository check rejects tracked environment files and credential-like literals before every build.

**Tech Stack:** TypeScript, Vite middleware, Cloudflare-compatible Worker ESM, Node.js verification scripts, Vitest.

---

### Task 1: Repository secret guard

**Files:**
- Create: `scripts/check-secret-safety.mjs`
- Modify: `.gitignore`
- Modify: `package.json`
- Modify: `README.md`

**Step 1: Add environment ignore rules**

Ignore `.env` and `.env.*`, while explicitly allowing the blank `.env.example`.

**Step 2: Write the failing repository check**

The script must inspect tracked and untracked, non-ignored source files and fail when:

- an environment file other than `.env.example` is included;
- a client-prefixed variant of the Geoapify key name appears anywhere;
- a credential-like value is assigned to `GEOAPIFY_API_KEY` or an `apiKey` URL parameter.

**Step 3: Wire the check into builds**

Add `npm run check:secrets` and make `npm run build` execute it before compilation.

**Step 4: Run the check**

Run: `npm run check:secrets`

Expected: PASS with only `.env.example` allowed.

### Task 2: Worker abuse protection

**Files:**
- Modify: `scripts/build-sites-worker.mjs`
- Modify: `scripts/verify-sites-worker.mjs`

**Step 1: Add failing Worker verification**

Verify:

- missing or oversized search text returns `400`;
- `limit` is clamped to `6`;
- a repeated normalized query uses the cache;
- more than the per-minute client allowance returns `429`;
- the runtime key is sent only on the Worker-to-Geoapify request.

**Step 2: Implement validation**

Accept only the existing parameter allowlist, normalize search text, constrain `type`, `lang`, `filter`, and `bias`, force `format=json`, and clamp `limit` to `1..6`.

**Step 3: Implement runtime protections**

Add a bounded five-minute in-isolate cache, a per-client sliding-window limiter, `Retry-After`, and a five-second upstream abort timeout. Never include the key in cache keys, responses, or logs.

**Step 4: Run the production build**

Run: `npm run build`

Expected: generated Worker verification passes.

### Task 3: Local parity and documentation

**Files:**
- Modify: `vite.config.ts`
- Modify: `README.md`

**Step 1: Mirror parameter validation locally**

Apply the same text length, allowed values, forced format, and limit clamping in the Vite proxy.

**Step 2: Add upstream timeout locally**

Abort Geoapify development requests after five seconds and return the existing upstream-error response.

**Step 3: Document public deployment**

Document Sites runtime Secret storage, GitHub push protection, production-key separation, proxy limitations, and key rotation.

### Task 4: Regression validation

**Files:**
- Test: `tests/features/place-search.test.ts`
- Test: `scripts/verify-sites-worker.mjs`

**Step 1: Run focused tests**

Run: `npm test -- --run tests/features/place-search.test.ts tests/features/infrastructure-terms.test.ts`

Expected: PASS.

**Step 2: Run all checks**

Run: `npm test`

Run: `npm run lint`

Run: `npm run build`

Expected: all tests and Worker verification pass; no client asset contains the key name or a credential value.
