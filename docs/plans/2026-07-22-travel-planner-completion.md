# Travel Planner Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Flatten the travel planner into the workspace root, complete outstanding functional gaps, and verify the desktop and mobile experience.

**Architecture:** The Vite application remains a single React state owner in `src/App.tsx`; desktop and mobile workspaces render from the same data and callbacks. Project metadata and source move from the accidental `DkimicodeTravel/` child directory to the `Travel/` root, while the existing design references stay in `design/`.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, React Testing Library, lucide-react.

---

### Task 1: Repair the repository layout

**Files:**
- Move: `DkimicodeTravel/*` to the workspace root
- Preserve: `design/**`, `旅行规划网页开发计划.md`

**Step 1: Verify the nested project contains the active Vite configuration, source, and tests.**

**Step 2: Move the project files, including hidden configuration, package metadata, source, tests, public assets, and installed dependency tree, to the root without overwriting existing references.**

**Step 3: Remove the now-empty nested project directory.**

**Step 4: Run project commands from the root to prove the corrected layout is usable.**

### Task 2: Validate existing functional requirements

**Files:**
- Test: `tests/app.test.tsx`
- Test: `tests/domain/*.test.ts`
- Test: `tests/db/*.test.ts`

**Step 1: Run the complete Vitest suite and record failures.**

**Step 2: Correct only the smallest code or test issue necessary for each genuine requirement failure.**

**Step 3: Run the suite again and confirm all tests pass.**

### Task 3: Build and rendered acceptance

**Files:**
- Validate: `src/App.tsx`, `src/components/**`, `src/styles/**`

**Step 1: Run the production TypeScript/Vite build.**

**Step 2: Start the local Vite server and open the root application.**

**Step 3: Check desktop and mobile rendering, then exercise view navigation and the add-schedule dialog.**

**Step 4: Resolve any observed functional or console issue and repeat validation.**
