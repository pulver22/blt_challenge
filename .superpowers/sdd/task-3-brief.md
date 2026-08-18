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

