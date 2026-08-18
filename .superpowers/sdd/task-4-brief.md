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

