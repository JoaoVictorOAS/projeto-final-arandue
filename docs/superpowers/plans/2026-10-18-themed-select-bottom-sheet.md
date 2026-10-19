# ThemedSelect & Bottom Sheet Mobile UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the archaic native Android select dialog with a modern, responsive `<ThemedSelect />` component featuring an animated Bottom Sheet drawer with search filtering on mobile and popover on desktop, fully integrated with Aranduê's dynamic theme tokens.

**Architecture:** Create a canonical `<ThemedSelect />` component that presents a tactile sketch-styled trigger button, renders an ergonomic Bottom Sheet on mobile viewports (< 640px) with automatic search for lists > 5 items and 48px touch targets, and integrates transparently into `<FormField as="select" />` to upgrade all form selects project-wide.

**Tech Stack:** React 19, Tailwind CSS v4, Lucide React (icons), Vitest / React Testing Library, Capacitor Android.

**Spec:** Brainstorming approved in chat (Option 1: Bottom Sheet Tátil Aranduê adhering to GEMINI.md Rules 7 and 8).

## Global Constraints

- **Dynamic Theme Tokens Only:** Must use CSS variables (`var(--bg-surface)`, `var(--bg-app)`, `var(--border-color)`, `var(--text-main)`, `var(--text-secondary)`, `var(--color-primary)`, `var(--bg-surface-hover)`); NO hardcoded colors.
- **Form Event Compatibility:** Must dispatch standard synthetic event `{ target: { name, value, id } }` on selection, maintaining 100% backward compatibility with React forms.
- **Ergonomics & WCAG:** Minimum 48px touch target height per option on mobile; backdrop scroll lock while open; smooth slide-up animation.

## Review Focus

1. **Option Value Types:** Handling both string/number values and `{ value, label }` objects or `<option>` children elements gracefully.
2. **Body Scroll Lock:** Ensuring `document.body.style.overflow = 'hidden'` is properly cleaned up on unmount or dismiss.
3. **Empty States:** When search query returns zero matching options, display a friendly empty message styled with theme muted text.
4. **Keyboard Accessibility & Escape Key:** Pressing Escape closes the bottom sheet/dropdown cleanly.
5. **Mobile Viewport Detection & Resize:** Responsively switching between Bottom Sheet drawer (< 640px) and anchored dropdown (>= 640px).

---

### Task 1: Canonical `ThemedSelect` Component and Unit Tests

**Files:**
- Create: `frontend/src/components/ThemedSelect.jsx`
- Create: `frontend/src/components/ThemedSelect.test.jsx`

**Interfaces:**
- Produces: `ThemedSelect({ id, name, value, onChange, options, placeholder, label, error, disabled, required, className, children })`

- [ ] **Step 1: Write the failing unit tests for `ThemedSelect`**
  Cover rendering, trigger button label, opening bottom sheet on click, selecting an item and calling `onChange({ target: { name, value } })`, search filtering when > 5 options, and closing on backdrop click or close button.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npm --prefix frontend test -- ThemedSelect.test.jsx`
  Expected: FAIL with "ThemedSelect not found"

- [ ] **Step 3: Implement `ThemedSelect` in `frontend/src/components/ThemedSelect.jsx`**
  - Parse options from `options` prop or `children` (`<option>`).
  - Trigger button with theme variables (`var(--border-color)`, `var(--bg-surface)`, `var(--text-main)`), `ChevronDown` icon, disabled and error states.
  - Mobile Bottom Sheet (< 640px): fixed overlay, `backdrop-blur-xs`, drag handle pill (`w-12 h-1.5 rounded-full`), header with field label/title and `X` close button, search input when options > 5, 48px touch targets, checkmark on selected item with `var(--color-primary)`.
  - Desktop popover (>= 640px): dropdown menu positioned beneath trigger with theme borders and shadows.
  - Body scroll lock during sheet open.

- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm --prefix frontend test -- ThemedSelect.test.jsx`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/components/ThemedSelect.jsx frontend/src/components/ThemedSelect.test.jsx
  git commit -m "feat(ui): add ThemedSelect component with mobile Bottom Sheet and search"
  ```

---

### Task 2: Integrate `ThemedSelect` into `FormField.jsx`

**Files:**
- Modify: `frontend/src/components/FormField.jsx`
- Modify / Test: `frontend/src/components/FormField.test.jsx` (or run existing test suite)

**Interfaces:**
- Consumes: `ThemedSelect` from `frontend/src/components/ThemedSelect.jsx`
- Produces: `FormField({ as: 'select', ... })` rendering `ThemedSelect` while retaining label, required asterisk, helpText, and error messages.

- [ ] **Step 1: Write or update test in `FormField.test.jsx` for `as="select"`**
  Verify that `FormField as="select"` delegates to `ThemedSelect` and propagates `onChange`, `label`, `error`, and `value`.

- [ ] **Step 2: Run test to observe behavior**
  Run: `npm --prefix frontend test -- FormField.test.jsx`

- [ ] **Step 3: Update `FormField.jsx` to render `ThemedSelect` when `as === 'select'`**
  Replace raw `<select>` inside `FormField.jsx` with `<ThemedSelect />`, passing through all props, labels, and error states.

- [ ] **Step 4: Run all frontend tests to ensure zero regressions**
  Run: `npm --prefix frontend test`
  Expected: All 21 test suites pass (160+ tests).

- [ ] **Step 5: Commit**
  ```bash
  git add frontend/src/components/FormField.jsx frontend/src/components/FormField.test.jsx
  git commit -m "feat(ui): integrate ThemedSelect into FormField for project-wide bottom sheets"
  ```

---

### Task 3: Build APK and Verify Installation via ADB

**Files:**
- Output: `dist-apk/arandue-mei-latest.apk`

- [ ] **Step 1: Run mobile build script**
  Run: `./scripts/update_apk_drive.sh`
  Verify Vite compilation, Capacitor sync, and Gradle `assembleDebug` build succeed.

- [ ] **Step 2: Verify ADB installation on connected smartphone**
  Check that the streaming install succeeds and the APK is live on the user's phone.

- [ ] **Step 3: Final verification and summary**
  Confirm all tests pass and report to the user.
