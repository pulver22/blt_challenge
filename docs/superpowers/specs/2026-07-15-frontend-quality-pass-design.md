# Frontend Quality Pass Design

## Goal

Improve the participant-facing BLT SLAM Challenge frontend so that its visual language, navigation, submission flow, and leaderboard interactions are coherent, accessible, and reliable across desktop and mobile viewports.

## Scope

This pass covers the public home page, the trajectory-submission form, leaderboard displays, and shared navigation and styling. It does not change API contracts, scoring rules, backend behaviour, or the admin workflow.

## Design decisions

### Information architecture

- Retain the current page order: overview, process, leaderboard preview, rules, submission, full leaderboard.
- Remove duplicated explanatory content from the leaderboard preview. The preview should show a useful snapshot and direct participants to the full leaderboard rather than recreate the full dashboard.
- Keep the existing agricultural palette and visual character, but make shared surface, spacing, typography, button, input, and feedback treatments consistent.

### Submission flow

- Make requirements visible before participants select a file: accepted trajectory extensions, required identity fields, and what happens after submission.
- Use clear client-side validation feedback, including a useful initial state before a file is selected.
- Prevent duplicate submission while an upload is in progress and expose an accessible busy state.
- Make the successful result actionable by clearly identifying the private status link and its purpose.

### Leaderboards

- Implement tabs using the ARIA tab pattern, including selected state and keyboard-friendly labelling.
- Present loading, empty, and unavailable states without implying a table has content.
- Keep the desktop table while providing a deliberate small-screen treatment that does not force users to interpret clipped content.

### Navigation, responsiveness, and accessibility

- Ensure primary navigation remains usable on small screens and links consistently target in-page sections.
- Add visible keyboard focus styles and preserve sufficient colour contrast for interactive controls and status messages.
- Use semantic headings, labelled controls, error feedback, and live regions where state changes dynamically.
- Adjust breakpoints and layout sizing so hero content, cards, forms, actions, and data views remain readable from 320px upward.

## Implementation boundaries

- Reuse the existing components and CSS where possible; do not add dependencies.
- Keep all API calls and data structures unchanged.
- Preserve existing user work in the dirty tree, including the trajectory-extension update already underway.

## Validation

- Add or extend focused component tests for changed interaction and validation behaviour.
- Run the frontend test suite and production build.
- Exercise the rendered home-to-submission and leaderboard-tab flows at desktop and mobile widths, checking page identity, meaningful content, console health, visible focus/feedback, and the absence of framework error overlays.

## Non-goals

- A brand redesign or new backend features.
- Changes to private-ground-truth handling, evaluation logic, or admin moderation controls.
