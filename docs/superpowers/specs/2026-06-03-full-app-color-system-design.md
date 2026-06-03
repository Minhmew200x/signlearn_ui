# SignLearn Full-App Brand Palette Redesign

**Goal:** Align every user-facing surface with the brand already established in `src/components/app/AppShell.jsx`: white-first layout, blue primary actions, amber accent highlights, slate only for supporting text and borders.

**Scope:** All current app surfaces: `App.jsx`, `Landing`, `Home`, `Blogs`, `LearningDashboard`, `TopicMoocPage`, `LessonPage`, `AIPracticePage`, `AuthApp`, `AuthViews` (including `AdminDashboard` and `AuthForm`), `HoSo`, and the app shell/header.

## Visual Direction

- Backgrounds: mostly white, with a very light blue/amber wash only on large page shells.
- Primary actions: blue fills, blue hover states, blue focus rings.
- Accent/highlight: amber badges, labels, and subtle emphasis blocks.
- Support tones: slate only for body copy, borders, and secondary metadata.
- Surfaces: rounded white cards, soft shadows, low-contrast borders.

## Shared System

- Reuse one shared visual language instead of page-specific one-offs.
- Keep the existing component structure and navigation flow.
- Centralize repeated button/card/header treatments where possible so future pages inherit the same palette by default.
- Preserve semantic colors for success, warning, and error states, but keep them secondary to the brand palette.

## Page Rules

- `Landing`: move the hero and CTAs to the white/blue/amber system; remove dark-first feel.
- `Home` and `LearningDashboard`: cards, progress bars, action buttons, and active states must follow the brand palette.
- `Blogs`: use white cards and blue active filters; keep status badges readable but not dominant.
- `TopicMoocPage`, `LessonPage`, `AIPracticePage`: convert dark hero panels and heavy slate sections into bright branded panels with blue actions and amber accents.
- `AuthApp` and `AuthViews`: keep the authentication flow visually consistent with the main brand system, not a separate dark theme.
- `HoSo`: profile cards, avatar picker, and logout actions should match the same white/blue structure.
- `AppShell`: the logo and header remain the visual anchor; navigation active states should match the new palette.

## Guardrails

- No routing changes.
- No API contract changes.
- No layout restructuring beyond visual cleanup.
- No new dependencies.
- Avoid introducing new accent colors unless they are semantic feedback colors.

## Acceptance Criteria

- The app no longer feels split between a dark admin-like theme and a bright public theme.
- Blue is the clear primary action color across all user-facing pages.
- Amber appears as the accent color, not as a competing primary.
- White cards and bright backgrounds dominate the UI.
- A final palette scan should show only intentional semantic leftovers, not primary-surface drift.
