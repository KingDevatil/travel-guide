# Travel Planner Acceptance Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Repair every blocking acceptance finding so the four main views operate on the selected persisted trip and backups, settlements, dates, responsive navigation, printing, and release metadata satisfy the V1 plan.

**Architecture:** Keep IndexedDB/Dexie as the source of truth and make the selected `Trip` the only input to all four primary views. Move reusable date, settlement, backup-remapping, and participant operations behind tested domain/repository interfaces; render a single responsive workspace so hidden desktop/mobile copies cannot duplicate effects.

**Tech Stack:** React 19, TypeScript, Vite, Dexie, Zod, MapLibre GL JS, Vitest, React Testing Library, fake-indexeddb.

---

### Task 1: Repair date boundaries and referential integrity

**Files:**
- Modify: `src/features/itinerary/ItineraryTimeline.tsx`
- Modify: `src/db/trip-repository.ts`
- Modify: `src/features/transfer/import-trip.ts`
- Test: `tests/features/data-integrity.test.ts`

**Steps:**
1. Write a failing test proving a 2025-10-12 trip begins on 2025-10-12 in positive-offset time zones.
2. Replace Date/ISO iteration with calendar-string arithmetic.
3. Write failing round-trip and duplicate tests for participant, stop, leg, and expense foreign keys.
4. Fully validate backup entities with the domain schemas and remap every foreign key before one transaction writes.
5. Run the focused tests until green.

### Task 2: Implement complete settlement behavior

**Files:**
- Modify: `src/features/expenses/settlement.ts`
- Modify: `src/features/expenses/ExpenseList.tsx`
- Create: `tests/features/settlement.test.ts`

**Steps:**
1. Add one failing test per split method: equal, shares, percentage, fixed.
2. Implement deterministic smallest-unit allocation and reject invalid allocation totals.
3. Add paid/planned/cancelled editing fields, payer, beneficiaries, currency, category, and per-expense split details.
4. Verify cancelled/planned expenses never enter settlement and currencies remain independent.

### Task 3: Connect selected trip to primary navigation

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/desktop/TopBar.tsx`
- Modify: `src/components/desktop/DesktopWorkspace.tsx`
- Modify: `src/components/mobile/MobileWorkspace.tsx`
- Create: `src/components/TripWorkspace.tsx`
- Create: `src/features/map/TripMapView.tsx`
- Test: `tests/integration/navigation.test.tsx`

**Steps:**
1. Write a failing navigation test proving each tab renders a real persisted feature.
2. Remove `defaultDays/defaultItems` and placeholder views.
3. Render only one responsive workspace and pass the selected Trip into itinerary, map, expenses, and packing.
4. Keep trip management focused on CRUD, participants, backup, and printing.
5. Verify selecting or creating a trip updates the header and all feature queries.

### Task 4: Complete trip, participant, itinerary, and packing workflows

**Files:**
- Modify: `src/features/trips/TripList.tsx`
- Modify: `src/hooks/useTrips.ts`
- Create: `src/features/trips/ParticipantManager.tsx`
- Modify: `src/features/itinerary/StopEditor.tsx`
- Modify: `src/features/itinerary/LegEditor.tsx`
- Modify: `src/features/packing/PackingList.tsx`
- Test: `tests/features/workflows.test.tsx`

**Steps:**
1. Add restore-archive behavior and participant CRUD.
2. Add complete stop/leg fields, coordinate copy, validation, delete explanation, and optional transport expense creation.
3. Add packing category, quantity, required, notes, edit/delete, bulk-unpack, and copy-from-trip.
4. Add focused behavior tests and keep each vertical slice green.

### Task 5: Repair accessibility, responsive layout, printing, and release metadata

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ConfirmDialog.tsx`
- Modify: `src/App.tsx`
- Create: `public/manifest.webmanifest`
- Create: `.openai/hosting.json`
- Test: `tests/integration/navigation.test.tsx`

**Steps:**
1. Remove the floating control that overlaps mobile navigation and make all primary targets at least 44px.
2. Add Escape, focus return, and dialog containment where practical.
3. Render a dedicated print view containing itinerary, transport, budget, and packing data.
4. Add manifest and Sites hosting metadata.
5. Run tests, lint, build, then visually verify desktop and 360px mobile flows in the in-app browser.
