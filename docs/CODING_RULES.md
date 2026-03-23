# Coding Rules

## TypeScript
- Zero errors always. Run `npx tsc --noEmit` before committing.
- No `as any` unless absolutely necessary - comment why.
- Strict null checks - guard every optional access.

## React
- Functional components only. No class components.
- Hooks at the top of every component - no conditional hooks.
- Memoize expensive computations with `useMemo`.
- Event handlers named `handleX` (e.g. `handleSearch`, `handleToggleFavourite`).

## Styling
- Tailwind CSS only - no inline styles, no CSS modules.
- Use existing design tokens - never introduce new hex values.
- `cn()` helper from `@/lib/utils` for conditional classes.
- Mobile first: style for 375px, then add `sm:`, `md:`, `lg:`, `xl:` breakpoints.
- 4px/8px spacing grid.

## Components
- shadcn/ui first. Only build custom components when shadcn doesn't have it.
- Lucide React for icons - no other icon libraries.
- Every component must handle: normal state, empty state, loading state, error state.
- No prop drilling beyond 2 levels - use context or composition.

## Data
- Mock data lives in `src/data/` - never hardcode data inline in components.
- Constants live in `src/lib/constants.ts`.
- When Supabase is wired, data fetching goes through React Query hooks in `src/hooks/`.

## Files
- One component per file.
- File name matches default export (e.g. `NfsSearchPage.tsx` exports `NfsSearchPage`).
- Named exports for non-page components (e.g. `export function NfsPropertyCard`).
- Default exports for page components (e.g. `export default function NfsSearchPage`).

## Imports
- `@/` alias for `src/` - always use it instead of relative paths beyond one level.
- Group imports: React → external libs → @/ components → @/ hooks → @/ data → @/ lib.

## Git
- Commit messages: `feat:`, `fix:`, `chore:`, `docs:` prefixes.
- One logical change per commit.
- Always `npm run build` before pushing.

## Security
- No hardcoded secrets, tokens, or API keys.
- All secrets go in `.env` (local) or Vercel env vars (production).
- VITE_ prefix required for client-side env vars.
- Never commit `.env` - it's in `.gitignore`.
