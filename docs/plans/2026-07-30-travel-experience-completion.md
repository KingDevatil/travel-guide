# Travel Experience Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn the existing local travel planner into a guided end-to-end experience covering recovery, planning, readiness, budgeting, navigation, on-trip use, and booking details while leaving packing recommendations unchanged.

**Architecture:** Extend the existing optional domain fields so old IndexedDB records and backup files remain valid. Add small pure-domain analyzers for itinerary warnings, readiness, route estimates, and budgets; surface them through focused React feature components rather than expanding `App`. Preserve the current visual system and lazy-load secondary workspaces.

**Tech Stack:** React 19, TypeScript 6, Dexie 4, Zod 4, Lucide React, Vitest, Testing Library, Vite.

---

### Task 1: Extend the optional travel metadata model

**Files:**
- Modify: `src/domain/models.ts`
- Modify: `src/domain/schemas.ts`
- Modify: `src/hooks/useTrips.ts`
- Test: `tests/domain/schemas.test.ts`

**Steps:**

1. Add failing schema tests for optional trip destination/budget fields and optional stop/leg booking metadata.
2. Run `npm test -- tests/domain/schemas.test.ts` and confirm the new assertions fail.
3. Add optional fields only, preserving schema version 1 compatibility:
   - `Trip.destination`, `Trip.budgetMinor`, `Trip.categoryBudgetsMinor`
   - `Stop.kind`, `Stop.unscheduled`, `Stop.bookingReference`, `Stop.contactInfo`, `Stop.documentUrl`
   - `Leg.bookingReference`, `Leg.contactInfo`, `Leg.documentUrl`
4. Update `TripDraft` so trip settings can save destination and budget.
5. Rerun the schema tests and TypeScript build.

### Task 2: Repair first-run creation and backup recovery

**Files:**
- Create: `src/features/transfer/ImportBackupButton.tsx`
- Modify: `src/features/transfer/BackupPanel.tsx`
- Modify: `src/features/trips/TripEditor.tsx`
- Modify: `src/App.tsx`
- Modify: `src/index.css`
- Test: `tests/app.test.tsx`

**Steps:**

1. Add an application test proving that a user with no trips can import a backup directly.
2. Add tests for the simplified new-trip copy and progressive disclosure of icon/timezone/currency settings.
3. Extract a reusable import button that validates a backup, reports errors, refreshes the trip list, and activates the imported copy.
4. Add “导入备份” beside “新建行程” on the empty screen.
5. Put destination/title and dates first in the new-trip form. Keep icon, timezone, and currency in an expandable “更多设置” section for new trips while preserving the full edit flow for existing trips.
6. Correct the new-trip explanatory copy and add two lightweight presets that prefill trip length without creating fake destinations.
7. Run the focused application tests.

### Task 3: Unify itinerary language and add fast planning actions

**Files:**
- Modify: `src/db/trip-repository.ts`
- Modify: `src/hooks/useItinerary.ts`
- Modify: `src/features/itinerary/ItineraryTimeline.tsx`
- Modify: `src/features/itinerary/StopEditor.tsx`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/index.css`
- Test: `tests/features/workflows.test.ts`
- Test: `tests/app.test.tsx`

**Steps:**

1. Add failing repository workflow tests for moving an arrangement to another date, duplicating an arrangement, duplicating a day, and deleting/moving a selection.
2. Implement transaction-safe repository functions that normalize `sortOrder` for affected days.
3. Expose the operations from `useItinerary`.
4. Replace user-facing “节点” copy with “安排”; keep “地点” only for geographic search results.
5. Add arrangement type choices and an “加入想去清单，稍后安排日期” option.
6. Add per-row copy and move-date actions, selection checkboxes, and a bulk action bar.
7. Add “复制当天” and a date-jump control.
8. Keep move-up/down buttons as an accessible and mobile-friendly alternative to drag ordering.
9. Run workflow and application tests.

### Task 4: Add itinerary warnings and route guidance

**Files:**
- Create: `src/domain/itinerary-analysis.ts`
- Create: `src/features/itinerary/ItineraryInsights.tsx`
- Modify: `src/features/map/TripMapView.tsx`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/index.css`
- Test: `tests/domain/itinerary-analysis.test.ts`

**Steps:**

1. Write failing pure-domain tests for overlapping arrangements, missing transport connections, Haversine distance, and a conservative travel-time estimate.
2. Implement deterministic analysis without a third-party routing dependency.
3. Show concise warnings for schedule overlaps, distant consecutive arrangements, and missing transport records.
4. Add route rows to the map view with distance/time estimates and a one-click external navigation link.
5. Add quick nearby-category search prompts for airports, stations, hotels, attractions, and restaurants without restoring input-as-you-type behavior.
6. Run the analysis tests and map-related tests.

### Task 5: Add trip readiness and on-trip mode

**Files:**
- Create: `src/domain/trip-readiness.ts`
- Create: `src/features/trips/TripOverview.tsx`
- Create: `src/features/trips/OnTripMode.tsx`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/types.ts`
- Modify: `src/index.css`
- Test: `tests/domain/trip-readiness.test.ts`
- Test: `tests/app.test.tsx`

**Steps:**

1. Add failing readiness tests for empty days, missing connections, budget state, packing progress, and backup freshness.
2. Implement a pure readiness summary.
3. Add a “总览” navigation destination with progress, unresolved warnings, budget state, packing completion, and backup reminder.
4. Add an “出行模式” view focused on one chosen date with the next arrangement, local time, booking details, and navigation links.
5. Keep the existing itinerary as the default view for backward-compatible tests.
6. Run readiness and application tests.

### Task 6: Turn the expense ledger into a budget experience

**Files:**
- Modify: `src/features/expenses/ExpenseList.tsx`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/index.css`
- Test: `tests/app.test.tsx`

**Steps:**

1. Add an application test for saving a total budget and category budgets.
2. Add budget setup controls using the trip default currency.
3. Show total budget, planned, paid, and remaining amounts before the expense form.
4. Show category progress and over-budget warnings.
5. Collapse advanced split/association fields until requested and show a useful ledger empty state.
6. Keep currencies independent rather than silently applying unreliable automatic exchange rates; explain this directly in the UI.
7. Run expense-related application tests.

### Task 7: Clarify AA members, sharing, and booking information

**Files:**
- Modify: `src/features/trips/ParticipantManager.tsx`
- Modify: `src/features/transfer/BackupPanel.tsx`
- Modify: `src/features/itinerary/StopEditor.tsx`
- Modify: `src/features/itinerary/LegEditor.tsx`
- Modify: `src/features/transfer/export-itinerary-html.ts`
- Modify: `src/index.css`
- Test: `tests/features/export-itinerary-html.test.ts`
- Test: `tests/app.test.tsx`

**Steps:**

1. Rename the visible member feature to “AA 费用成员” and explicitly state that it does not invite collaborators.
2. Add a share action that copies a readable trip summary and keep HTML export as the durable shareable artifact.
3. Add booking reference, contact information, and document-link fields to arrangements and transport.
4. Surface booking fields in on-trip mode and HTML export.
5. Add export and interaction tests.

### Task 8: Fix mobile form and long-trip navigation usability

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/TripWorkspace.tsx`
- Modify: `src/features/trips/TripEditor.tsx`
- Modify: `src/features/itinerary/StopEditor.tsx`
- Test: `tests/app.test.tsx`

**Steps:**

1. Move sticky dialog actions into a non-overlapping footer layout at narrow widths.
2. Replace the always-visible native horizontal scrollbar with a date strip plus explicit date picker.
3. Verify controls remain at least 44 px, labels do not truncate important states, and dialogs preserve reading order.
4. Add assertions for the date-jump and progressive form states.

### Task 9: Full regression and rendered QA

**Files:**
- Modify only files required by discovered regressions.

**Steps:**

1. Run `npx tsc -b`.
2. Run `npm run lint`.
3. Run `npm test`.
4. Run `npm run build` and verify the secret-safety and Sites worker checks.
5. In the in-app browser, verify:
   - empty screen → import or new trip
   - new trip → simplified form → overview
   - add arrangement → move/copy/bulk actions
   - overview → readiness and on-trip mode
   - budget setup → remaining budget
   - map → route estimate and navigation
   - AA members and booking details
6. Capture desktop and mobile screenshots, inspect them, and fix visible overlap, clipping, or unclear empty states.
7. Commit and push directly to `main` without adding GitHub Actions.
