# FamilySync — Phase 1 Changelog

This file tracks all intentional changes during Phase 1.
Each entry represents a **known-good state** or an **incremental polish pass**.
Rollback should always target the most recent locked version.

---

## Home v1.1 — Locked Baseline
**Status:** LOCKED  
**Date:** 2025-12-26

### Scope
- Initial interactive Home screen
- Editable Quick Links (local-only state)
- No backend, no navigation, no persistence
- Expo SDK 54, pnpm-only baseline

### Notes
- Fixed critical touch interception bug in header
- Edit button reliably toggles edit/view mode
- Quick Links add/remove/edit works
- iOS simulator verified, no red screens

---

## Home v1.2 — Visual Polish (In Progress)
**Status:** ACTIVE

### Scope
- Home screen visual polish only
- Hero “Welcome back” banner
- Today’s activities section
- Mini stats tiles (Events / Tasks / Birthdays / Messages)
- No logic or architecture changes

### Rules
- UI/UX changes only
- Placeholder data allowed
- No new dependencies
- No backend wiring

## Home v1.3.1 — Notch / Safe Area Fix
**Status:** LOCKED  
**Date:** 2025-12-26

### Changes
- Wrapped app root in `SafeAreaProvider` (required for safe-area insets).
- Home header now uses safe-area inset padding so “FamilySync” is never clipped by the notch/Dynamic Island.

### Notes
- No behaviour changes.
- No dependency changes.
