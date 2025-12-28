# FamilySync — Phase 1 Lock (Stability + Clarity)

This document records the **Phase 1 lock state** and the **pre-production removal checkpoints**.

## Phase 1 is feature-complete
No new features should be added on this branch/tag. This work is limited to:
- removing/quarantining dead code,
- eliminating redirect shims/duplicate screens,
- tightening naming/copy consistency,
- ensuring deterministic navigation.

## Navigation (locked)
Bottom tabs:
- Home
- Calendar
- Messages
- Settings

Settings tab must render the **SettingsStack** (not legacy shims).

## Calendar (locked)
Calendar includes internal mini-tabs:
- Calendar
- School runs
- School holidays

All Calendar items are local-only in Phase 1.

## Backend policy (Phase 1)
Supabase backend exists but must remain untouched in Phase 1.
No new Supabase touchpoints should be wired during Phase 1 cleanup.

## Dev-only flag (TEMPORARY)
**EXPO_PUBLIC_DEV_SKIP_ONBOARDING** is enabled during Phase 1 dev work to accelerate reloads.

### Removal checkpoint (required before TestFlight / production)
Before any TestFlight or production release:
- Remove/disable EXPO_PUBLIC_DEV_SKIP_ONBOARDING bypass logic.
- Verify first-run onboarding flow works end-to-end.
- Tag a release candidate after removal.

(Keep this note until the removal is completed and verified.)
