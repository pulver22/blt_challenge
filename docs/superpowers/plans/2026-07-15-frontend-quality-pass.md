# Frontend Quality Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the participant-facing BLT challenge frontend clearer, more consistent, accessible, and usable on desktop and mobile without changing API contracts.

**Architecture:** Retain the existing React component boundaries and Vite/Vitest stack. Make small, local component changes to expose clear interactive states and consolidate shared presentation rules in `styles.css`; add component tests alongside current library tests so participant-facing behaviour is covered without calling the backend.

**Tech Stack:** React 19, Vite 7, Vitest 2, Testing Library, lucide-react, CSS.

## Global Constraints

- Do not add dependencies.
- Do not change `/api/*` requests, backend behaviour, scoring, or admin features.
- Preserve the existing uncommitted trajectory-extension change in `SubmissionPanel.jsx`, `submission.js`, and `submission.test.js`.
- Support desktop and viewports from 320px wide upward.
- Retain the existing agricultural colour palette and API data shapes.

---

### Task 1: Establish accessible global interaction and responsive style primitives

**Files:**
- Modify: `src/styles.css:1-682`

**Interfaces:**
- Consumes: Existing class names on navigation, actions, form controls, messages, card surfaces, tabs, and table wrappers.
- Produces: Consistent focus-visible, disabled, status, and responsive styles used by Tasks 2–4.

- [ ] **Step 1: Add semantic focus and status styles**

Add a shared keyboard indicator and error/success presentation that do not rely on colour alone:

```css
:focus-visible {
  outline: 3px solid #6f7f38;
  outline-offset: 3px;
}

.validation::before {
  content: "Notice: ";
  font-weight: 800;
}

.validation.valid::before {
  content: "Ready: ";
}
```

Keep the existing colours, increase message spacing and contrast where necessary, and add `button:disabled` styles so all disabled controls have consistent cursor, opacity, and non-hover behaviour.

- [ ] **Step 2: Make small-screen controls and data views deliberate**

Replace the blanket full-width rule for every `.tab` with action-specific mobile rules. Add responsive helpers for the new leaderboard cards created in Task 3, preserving the desktop table while hiding it only below the mobile breakpoint:

```css
.leaderboard-cards { display: none; }

@media (max-width: 560px) {
  .hero-actions .primary-action,
  .hero-actions .secondary-action,
  .submission-card .primary-action { width: 100%; }
  .table-wrap { display: none; }
  .leaderboard-cards { display: grid; gap: 0.75rem; }
}
```

Ensure navigation links wrap without overlap, card padding remains readable at 320px, and tabs remain compact inline controls rather than a vertical stack.

- [ ] **Step 3: Verify the style build remains valid**

Run: `npm run build`

Expected: `✓ built in` output and no CSS or module-resolution errors.

### Task 2: Clarify and harden the trajectory-submission flow

**Files:**
- Modify: `src/components/SubmissionPanel.jsx:1-199`
- Create: `src/components/SubmissionPanel.test.jsx`
- Modify: `src/styles.css:360-470`

**Interfaces:**
- Consumes: `submitTrajectory(form, file)`, `validateTrajectoryUpload({ name })`, `challenge.officialRun`, and the existing submission response shape.
- Produces: Accessible validation and busy/success states. No new props or API calls.

- [ ] **Step 1: Write failing component tests for the public submission states**

Mock `../lib/api` and use Testing Library to assert the form starts with helpful file guidance, blocks an incomplete upload, disables the submit control while the request is unresolved, and renders the returned status link:

```jsx
vi.mock('../lib/api', () => ({ submitTrajectory: vi.fn() }));

it('disables submission until all required fields and a valid trajectory are supplied', () => {
  render(<SubmissionPanel />);
  expect(screen.getByRole('button', { name: /submit for live evaluation/i })).toBeDisabled();
  expect(screen.getByText(/choose a tum text trajectory/i)).toBeInTheDocument();
});

it('announces the queued submission and exposes its private status link', async () => {
  submitTrajectory.mockResolvedValue({ attempt_number: 1, status_url: '/submissions/a?token=b', remaining_attempts: 2 });
  // complete required fields, select a File named `run.tum`, then submit
  expect(await screen.findByRole('link', { name: /view private submission status/i })).toHaveAttribute('href', '/submissions/a?token=b');
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run: `npm test -- --run src/components/SubmissionPanel.test.jsx`

Expected: FAIL because the current component always enables its submit button and lacks the initial guidance, accessible busy state, and named status link.

- [ ] **Step 3: Implement explicit validation and busy states**

In `SubmissionPanel.jsx`, derive `canSubmit` from the existing required fields, valid file, and `submitting`. Give the button `disabled={!canSubmit}` and `aria-busy={submitting}`. Change the initial no-file message in `validateTrajectoryUpload` or locally distinguish it so it tells participants to choose a TUM text file rather than presenting it as an error. Mark validation/error feedback with `role="status"` or `role="alert"` as appropriate, and change the success anchor to an explicit accessible name:

```jsx
<button className="primary-action" type="submit" disabled={!canSubmit} aria-busy={submitting}>
  <UploadCloud size={18} />
  {submitting ? 'Uploading trajectory…' : 'Submit for live evaluation'}
</button>

<a href={submission.status_url}>View private submission status</a>
```

Update the file-control copy to list `.txt`, `.tum`, and `.tum.tum` as accepted TUM trajectory text extensions, keeping the existing extension-validation logic intact.

- [ ] **Step 4: Run the component and helper tests**

Run: `npm test -- --run src/components/SubmissionPanel.test.jsx src/lib/submission.test.js`

Expected: PASS.

### Task 3: Make leaderboard navigation semantic and responsive

**Files:**
- Modify: `src/components/Leaderboard.jsx:1-94`
- Create: `src/components/Leaderboard.test.jsx`
- Modify: `src/styles.css:280-350`

**Interfaces:**
- Consumes: `fetchLeaderboards()` and its `{ lidar, vision, combined }` response; `categories`, `categoryLabel`, and `formatRmse`.
- Produces: An ARIA-compliant tablist, useful compact dashboard navigation, and mobile cards from the existing rows.

- [ ] **Step 1: Write failing leaderboard interaction tests**

Mock `fetchLeaderboards` with one LiDAR and one Vision result. Test tab selection and its panel relationship, a compact call-to-action, and a readable unavailable-state message:

```jsx
it('selects a category with an accessible tab and updates its panel', async () => {
  render(<Leaderboard />);
  await screen.findByText('RowMapper');
  await userEvent.click(screen.getByRole('tab', { name: 'Vision SLAM' }));
  expect(screen.getByRole('tab', { name: 'Vision SLAM' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: /vision slam leaderboard/i })).toHaveTextContent('CropLoop');
});
```

- [ ] **Step 2: Run the leaderboard tests to confirm they fail**

Run: `npm test -- --run src/components/Leaderboard.test.jsx`

Expected: FAIL because the existing buttons have no tab semantics or tab panel and compact mode lacks a full-dashboard action.

- [ ] **Step 3: Implement tab and compact-preview semantics**

Give each category button `role="tab"`, `aria-selected`, `aria-controls`, and stable IDs. Wrap the data state in a `role="tabpanel"` region labelled by the selected tab. Keep the visible data columns unchanged on desktop. For compact mode, show at most four rows and render one link to `/#leaderboards` with copy such as `View full leaderboards`; do not repeat the explanatory paragraph that belongs to the full dashboard.

Render the same `visibleRows` as concise `.leaderboard-cards` for mobile, including rank, team/method, ATE RMSE, and category. The table remains the desktop presentation, and the cards provide the mobile presentation.

- [ ] **Step 4: Run leaderboard tests**

Run: `npm test -- --run src/components/Leaderboard.test.jsx`

Expected: PASS.

### Task 4: Remove redundant dashboard content and align page navigation

**Files:**
- Modify: `src/App.jsx:1-170`
- Modify: `src/styles.css:32-185`
- Create: `src/App.test.jsx`

**Interfaces:**
- Consumes: Existing `challenge` URLs and `Leaderboard`, `SubmissionPanel`, and `MetricCard` components.
- Produces: A public home page with one full leaderboard section, a non-redundant preview, and navigation that targets each visible section.

- [ ] **Step 1: Write a failing page-structure test**

Mock the leaderboard API and verify the main navigation has working hash destinations, the leaderboard preview carries a clear full-dashboard link, and only the full leaderboard has the `leaderboards` anchor:

```jsx
it('keeps main navigation destinations and one full leaderboard landmark', async () => {
  render(<App />);
  expect(screen.getByRole('link', { name: /submit/i })).toHaveAttribute('href', '/#submit');
  expect(document.querySelectorAll('#leaderboards')).toHaveLength(1);
  expect(await screen.findByRole('link', { name: /view full leaderboards/i })).toHaveAttribute('href', '/#leaderboards');
});
```

- [ ] **Step 2: Run the page test to confirm it fails**

Run: `npm test -- --run src/App.test.jsx`

Expected: FAIL because both compact and full leaderboards currently emit `id="leaderboards"`.

- [ ] **Step 3: Give preview and full dashboard separate landmarks**

Update `Leaderboard` so `id="leaderboards"` is emitted only for the full dashboard and compact mode receives a distinct optional `id` such as `leaderboard-preview`. In `App.jsx`, retain the preview near the participant journey but name it as a snapshot and let its dedicated link navigate to the full section. Ensure `SiteNav` links remain aligned with the exact visible sections and add an accessible label to the hero summary card where helpful.

- [ ] **Step 4: Run page and component tests**

Run: `npm test -- --run src/App.test.jsx src/components/Leaderboard.test.jsx src/components/SubmissionPanel.test.jsx`

Expected: PASS.

### Task 5: Run production and rendered frontend validation

**Files:**
- Modify: no source files expected

**Interfaces:**
- Consumes: Completed source and test changes from Tasks 1–4.
- Produces: Fresh validation evidence for the final handoff.

- [ ] **Step 1: Run all frontend tests and the production build**

Run: `npm test -- --run && npm run build`

Expected: All Vitest files pass and Vite produces `dist/` without errors.

- [ ] **Step 2: Validate the rendered desktop flow**

Run the Vite app and test: home page loads → participant chooses the Submission navigation/action → initial file guidance is visible → valid file and required fields enable submission → selecting a leaderboard tab updates the active panel. Confirm page identity, non-blank meaningful content, no framework overlay, console health, a screenshot, and the interaction result.

- [ ] **Step 3: Validate the rendered mobile flow**

At a 375px-wide viewport, confirm navigation wraps without overlap, hero and form controls remain readable, tabs stay usable, and leaderboard cards replace the wide table without clipping. Capture a screenshot and confirm console health remains clean.

- [ ] **Step 4: Commit the frontend quality pass**

Run: `git add src/App.jsx src/styles.css src/components/Leaderboard.jsx src/components/Leaderboard.test.jsx src/components/SubmissionPanel.jsx src/components/SubmissionPanel.test.jsx src/lib/submission.js src/lib/submission.test.js && git commit -m "feat: improve participant frontend experience"`

Expected: One focused commit containing only frontend-quality changes, with pre-existing unrelated changes left unstaged.

## Plan self-review

- Spec coverage: Tasks 1–4 cover design consistency, redundant dashboard content, submission clarity, tab semantics, feedback, navigation, focus treatment, and mobile layouts. Task 5 supplies build, test, desktop, and mobile evidence.
- Placeholder scan: no deferred requirements or undefined implementation steps remain; screenshots and temporary browser artifacts are intentionally excluded from the repository.
- Interface consistency: component tests use current exported components, existing API helpers, and the current leaderboard/submission response fields. No API or backend interface changes are required.
