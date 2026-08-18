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

