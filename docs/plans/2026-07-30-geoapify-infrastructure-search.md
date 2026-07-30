# Geoapify Infrastructure Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace location-specific search exceptions with a reusable infrastructure dictionary, prefer Geoapify when configured, and fall back to Nominatim automatically.

**Architecture:** The React client keeps explicit submit-only search and calls a same-origin Geoapify proxy so the API key is never bundled into browser code. The search service expands generic Chinese infrastructure terms, normalizes Geoapify and Nominatim responses into one model, and reports the provider actually used. The generated Sites Worker and local Vite server expose the same proxy endpoint.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Cloudflare-compatible Sites Worker, Vitest, Testing Library.

---

### Task 1: Add the infrastructure dictionary

**Files:**
- Create: `src/data/infrastructure-terms.ts`
- Test: `tests/features/infrastructure-terms.test.ts`

**Step 1: Write the failing tests**

Cover named facilities such as `浦东机场`, `虹桥火车站`, `静安寺地铁站`, and generic public facilities. Assert that the original query remains first and English expansions contain the untouched proper-name portion.

**Step 2: Run the focused test**

Run: `npm test -- --run tests/features/infrastructure-terms.test.ts`

Expected: FAIL because the dictionary module does not exist.

**Step 3: Implement the dictionary**

Create typed entries with Chinese aliases and canonical English terms for airports, rail, metro, bus, ferry, ports, hospitals, pharmacies, police, fire services, fuel, charging, parking, toilets, banks, ATMs, and tourist information.

**Step 4: Run the focused test**

Run: `npm test -- --run tests/features/infrastructure-terms.test.ts`

Expected: PASS.

### Task 2: Add Geoapify-first search with Nominatim fallback

**Files:**
- Modify: `src/services/place-search.ts`
- Modify: `tests/features/place-search.test.ts`

**Step 1: Write failing provider tests**

Test Geoapify parameter generation, response normalization, provider reporting, missing-key fallback, upstream-error fallback, zero-result fallback, dictionary query expansion, and removal of known Shanghai/Bangkok location exceptions.

**Step 2: Run the focused test**

Run: `npm test -- --run tests/features/place-search.test.ts`

Expected: FAIL against the Nominatim-only implementation.

**Step 3: Implement the provider chain**

Call `/api/geoapify/geocode` first, map `results[]` into the application result model, and fall back to rate-limited Nominatim when the proxy returns an unavailable response, throws, or returns no usable result. Cache normalized result batches including their provider.

**Step 4: Run the focused test**

Run: `npm test -- --run tests/features/place-search.test.ts`

Expected: PASS.

### Task 3: Add local and hosted Geoapify proxies

**Files:**
- Modify: `vite.config.ts`
- Modify: `scripts/build-sites-worker.mjs`
- Modify: `scripts/verify-sites-worker.mjs`

**Step 1: Add a local proxy**

Read `GEOAPIFY_API_KEY` from Vite environment loading, whitelist supported geocoding parameters, append the secret server-side, and return a structured 503 response when the key is absent.

**Step 2: Add the Sites Worker proxy**

Handle `GET /api/geoapify/geocode`, read `env.GEOAPIFY_API_KEY`, forward to the official Geoapify autocomplete endpoint, and preserve the SPA/static asset behavior.

**Step 3: Extend worker verification**

Assert that an unconfigured generated Worker returns the structured 503 response and never exposes an API key in client assets.

**Step 4: Run the production build**

Run: `npm run build`

Expected: PASS with `Sites worker verification passed`.

### Task 4: Surface the real provider in the editor

**Files:**
- Modify: `src/features/itinerary/StopEditor.tsx`
- Modify: `tests/app.test.tsx`

**Step 1: Update the component contract**

Consume provider-aware search batches and display `Geoapify` or `OpenStreetMap Nominatim` based on the completed search.

**Step 2: Preserve submit-only behavior**

Keep input changes side-effect free; only button clicks or Enter start city/place searches.

**Step 3: Run interaction tests**

Run: `npm test -- --run tests/app.test.tsx`

Expected: PASS with no result before submit and results after submit.

### Task 5: Document configuration and validate

**Files:**
- Modify: `README.md`
- Create: `.env.example`

**Step 1: Document local configuration**

Add `GEOAPIFY_API_KEY=` to `.env.example` and explain that leaving it empty activates Nominatim fallback.

**Step 2: Run all automated checks**

Run: `npm run lint`

Run: `npm test`

Run: `npm run build`

Expected: all checks pass.

**Step 3: Perform browser QA**

Verify the flow `manage itinerary -> add stop -> type city/place -> no request result before submit -> submit -> provider-labelled results`, plus desktop and mobile layouts and console health.
