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

