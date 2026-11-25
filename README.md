# CollabTask

Real-time collaborative task management SaaS platform built with **React, TypeScript, Vite, Tailwind CSS, Zustand, React Hook Form, Zod, @dnd-kit, Recharts**, and **Firebase** (Authentication, Cloud Firestore, Cloud Storage, Cloud Functions v2, Cloud Messaging, App Check).

## Documentation

- [System Architecture](docs/ARCHITECTURE.md)
- [Firestore Database Schema](docs/DATABASE_SCHEMA.md)
- [Security Model & RBAC](docs/SECURITY_MODEL.md)
- [Phased Implementation Plan](docs/IMPLEMENTATION_PLAN.md)

## Quick Start

1. Copy `.env.example` to `.env.local` and fill in your Firebase Web App credentials (or set `VITE_USE_FIREBASE_EMULATORS=true` for local emulator development).
2. Install dependencies:
   ```bash
   npm install
   npm --prefix functions install
   ```
3. Run locally:
   ```bash
   npm run dev
   ```
4. Start Firebase Emulators (optional):
   ```bash
   npm run emulators
   ```

## Scripts

- `npm run typecheck` — Strict TypeScript check (`tsc --noEmit`)
- `npm run lint` — ESLint across all TypeScript/React files
- `npm run test` — Run Vitest unit & security tests
- `npm run build` — Production build verification
