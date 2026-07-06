# Moto Mobile Client — Project Instructions

React Native + Expo app for the Moto motorcycle-rider platform. Dark theme, orange accent, pixel-perfect to a fixed design system.

## 🎨 UI/UX Workflow — READ THIS BEFORE ANY UI WORK

**MANDATORY, non-negotiable order of operations whenever you touch UI (screens, components, navigation, styling):**

1. **FIRST, open and read the design file:**
   `file:///Users/shoyo/Downloads/Moto%20Platform%20Design%20System/Moto%20Platform.dc.html`
   (absolute path: `/Users/shoyo/Downloads/Moto Platform Design System/Moto Platform.dc.html`)
   - It is the single source of truth for layout, spacing, colors, typography, radii, shadows, and interaction states.
   - Find the matching screen/component (search the `<!-- ===== SCREEN ===== -->` markers) and match it **pixel-perfect**: exact px values, colors, font weights, gaps, border radii.
   - Do **not** invent, approximate, or "improve" the design. If the design shows `64px` height and `24px` radius, use exactly those.

2. **THEN, apply industry best practices** on top of the exact design:
   - Reusable components over copy-paste; pull shared values from `src/theme.ts`.
   - Accessibility: `accessibilityRole`, `accessibilityLabel`, adequate hit slop (≥44px touch targets), sufficient contrast.
   - Responsive: use flex + `SafeAreaView`; never hardcode screen widths. The design frame is 390×844 — treat those as proportions, not absolutes.
   - Performance: memoize lists (`FlatList`/`keyExtractor`), avoid inline functions in hot render paths, use `StyleSheet.create`.
   - Platform correctness: prefer `alignSelf: 'center'` over `left: '50%' + marginLeft` for centering; use `expo-linear-gradient` for gradients (RN has no CSS gradients).

If a request conflicts with the design file, the design file wins — surface the conflict to the user rather than silently diverging.

## Design System (mirror of the design file — `src/theme.ts` is the code source of truth)

| Token | Value | Use |
|-------|-------|-----|
| Background | `#0A0B0D` | app/screen background (design uses a subtle radial gradient toward `#161616` at top) |
| Surface / card | `#15171C` | cards, tiles, nav bar base |
| Primary | `#FF5A1F` | orange — primary actions, active states, accents |
| Primary gradient | `#FF6A2F → #E8410C` @150° | FAB, avatar, hero CTAs |
| Secondary | `#2E8BFF` | blue — informational |
| Success | `#30D158` | green |
| Danger | `#FF453A` | red — destructive (Sign Out, SOS) |
| Warning | `#FFD60A` | yellow — maintenance/hazards |
| Text | `#F2F3F5` | primary text |
| Muted | `#9AA0AB` | secondary text |
| Faint | `#6B7280` | tertiary text, chevrons, section labels |

- **Font:** Inter, weights 400–800. Section labels: `600 12px`, `letter-spacing .08em`, color `#6B7280`, UPPERCASE.
- **Radii:** cards `18–24px`, buttons `16px`, pills `20px`, small tiles `12–13px`.
- **Spacing:** use `spacing(n)` from `theme.ts` (`n * 8`).
- **Bottom nav:** 64px tall, 24px radius, `rgba(21,23,28,0.94)`, `space-around`; center RIDE FAB 62×62, `top:-14`, 4px `#0A0B0D` border, orange gradient, "RIDE" label at `top:50` centered.

## Project Structure

- `src/screens/` — one file per screen (Home, Trips, Groups, Garage, Profile, BikeForm, BikeDetail, auth screens, etc.)
- `src/components/` — shared UI (`ui.tsx` for Button/Field/etc., `layout.tsx` for Header/Card/LinkRow, `DateField`)
- `src/navigation/` — `RootNavigator`, `Navigator`, `BottomTabNavigator`, deeplink
- `src/api/` — typed API client + React Query queries/mutations (types from `@moto/contract`)
- `src/auth/` — `AuthContext`, token storage (`expo-secure-store`), mutations
- `src/theme.ts` — design tokens (keep in sync with the design file)

## Architecture Conventions

- **State/data:** React Query for all server state; mutations invalidate the relevant `queryKeys`.
- **Types:** import request/response shapes from `@moto/contract` — never redefine them. No type drift with the backend.
- **Auth:** access token in memory only; refresh token persisted via `expo-secure-store`. Cold-start restore lives in `AuthContext`.
- **Backend:** NestJS API (see `../moto-backend`). Dev API host is the machine's LAN IP on `:3000`.

## Knowledge Graph

A graphify knowledge graph of the backend lives in `../moto-backend/graphify-out/` (`graph.html`, `GRAPH_REPORT.md`, `graph.json`). Consult it for backend architecture questions (god nodes: BikeService, AuthService, CacheService, PrismaService). Rebuild with `/graphify` after significant backend changes.

## Commands

- `npm run dev` — Expo dev server
- `npm run ios` / `npm run android` — native builds
- `npm run typecheck` — TypeScript check (run before considering UI work done)
