# moto-client

React Native (Expo) app for the Moto platform. Ships to **Play Store / App Store** via EAS.

## Prerequisites
- The `moto-contract` repo cloned as a **sibling** (`../moto-contract`) — consumed via `file:../moto-contract`.
  `metro.config.js` is wired to resolve it from there.

## Setup
```bash
cp .env.example .env      # point EXPO_PUBLIC_API_URL at your backend
npm install
npm run dev               # Expo dev server; press i / a for simulator
```

## Notes
- Uses a **dev build** (EAS) once native modules (maps, background location) land — Expo Go won't be enough then.
- API request/response types come from `@moto/contract`, the same source the backend validates against.
