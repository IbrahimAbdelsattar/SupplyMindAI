# SupplyMindAI — Agent Guidelines

## Project Overview
SupplyMind AI is an AI-powered demand forecasting and inventory optimization platform. It features a Neumorphism Design System with a professional dark mode and premium animations following Emil Design Engineering principles.

## Technology Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Animation:** Framer Motion (Emil Design principles)
- **State:** React Query + Context API
- **Router:** React Router DOM
- **Auth:** None (demo mode — all users are admin)
- **Charts:** Recharts

## Design System

### Neumorphism Design System
We use a soft 3D aesthetic with raised/inset elements.

**Light Mode:**
- Raised: `box-shadow: 6px 6px 10px rgba(163,177,198,0.40), -6px -6px 10px rgba(255,255,255,0.75)`
- Inset (Basin): `box-shadow: inset 4px 4px 6px rgba(163,177,198,0.30), inset -4px -4px 6px rgba(255,255,255,0.65)`
- Surfaces: Pure white (#FFFFFF)

**Dark Mode:**
- Raised: `box-shadow: 5px 5px 10px rgba(5,7,15,0.65), -5px -5px 10px rgba(30,42,75,0.45)`
- Inset (Basin): `box-shadow: inset 4px 4px 8px rgba(0,0,0,0.55), inset -4px -4px 8px rgba(30,42,75,0.30)`
- Surfaces: Deep navy (#121A2B)
- Accents: Electric blue + teal gradient glows on primary elements

### Tailwind Classes (Neumorphism)
Use these utility classes for consistent neumorphism:
- `.neu-card` — Card with raised shadow
- `.neu-btn` — Raised button
- `.neu-basin` — Inset/contained element
- `.neu-glow` — Primary CTA with gradient + glow
- `.neu-surface` — Dark-only elevated surface
- `.neu-lift` — Dark-only hover lift effect
- `.neu-focus` — Focus ring

### Accessibility
- **prefers-reduced-motion:** All animations respect this media query
- **Touch devices:** Hover effects are gated behind `@media (hover: hover)`
- **Color contrast:** All text passes WCAG AA in both light and dark modes

## Animation Principles (Emil Design)
- **Easing:**
  - `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` — UI interactions
  - `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` — Movement on screen
  - `--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` — Drawers/modals
  - `--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)` — Playful elements
- **Spring Configs:**
  - `SPRING_SUBTLE: { type: 'spring', duration: 0.5, bounce: 0.15 }`
  - `SPRING_NORMAL: { type: 'spring', duration: 0.5, bounce: 0.2 }`
  - `SPRING_LIVELY: { type: 'spring', duration: 0.6, bounce: 0.3 }`
- **Durations:**
  - Button press: 160ms
  - Tooltips/small popovers: 125-200ms
  - Dropdowns: 150-250ms
  - Modals/drawers: 200-500ms
  - Stagger: 50-80ms per item
- **Critical Rules:**
  - Never use `ease-in` for UI animations (feels sluggish)
  - Never scale from `scale(0)` — start from `scale(0.95)` + opacity
  - Use custom easing curves — default CSS easings are too weak
  - UI animations should stay under 300ms
  - Keyboard-initiated actions: NO animation
  - Use CSS transitions over keyframes for rapid UI state changes

## Component Conventions
- Use shadcn/ui components as base, extending with `.neu-*` classes
- Button components include `active:scale-[0.97]` for press feedback
- Card components use `.neu-card` for consistent shadow
- Form inputs use `.neu-basin` for inset appearance in light mode

## File Structure
- `src/components/ui/` — shadcn/ui base components
- `src/components/landing/` — Landing page sections
- `src/components/dashboard/` — Dashboard widgets
- `src/components/brand/` — Brand assets (logo, etc.)
- `src/contexts/` — React contexts (Theme, Auth, Currency)
- `src/lib/animations.ts` — Animation utilities and constants
- `src/pages/` — Route-level pages

## Important Notes
- **index.css** is the central style file containing the Neumorphism system, CSS variables, and animations
- Theme toggle is managed in `src/contexts/ThemeContext.tsx`
- Dark mode uses `html.dark` class added by ThemeContext
- Chart gradients: use `hsl(var(--primary))` for consistent theme
- Always test both light and dark modes when making UI changes
- Always test with `prefers-reduced-motion: reduce` enabled
