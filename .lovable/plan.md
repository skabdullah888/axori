# Axora User Dashboard — Build Plan

This is a large build (12+ pages, auth, realtime, publish flow, wallet). I'll ship it in phased commits so you can review as it grows, all on the existing Lovable Cloud backend (same DB as the admin panel at `/sk-control-panel-99`).

## Architecture

- New route group `src/routes/_user/*` (pathless layout, auth-guarded for non-admin users)
- New `src/routes/auth/login.tsx` and `src/routes/auth/register.tsx` (public)
- New `UserShell` component: sticky sidebar + topbar with profile dropdown (logout here, not in sidebar)
- All data via `supabase` client + realtime channels (same pattern as admin)
- Root `/` redirects: authed user → `/dashboard-user`, admin → `/dashboard`, guest → `/auth/login`
- Admin route `/sk-control-panel-99` stays untouched

## Database additions (one migration)

Adds columns/tables needed for user features (admin already has most):
- `profiles`: add `phone`, `avatar_url`, `referral_code` (unique), `referred_by` (uuid), `activated_at`, `last_activation_request_at`
- `tasks`: add `category`, `deadline`, `proof_count`, `proof_type`, `instructions`, `proof_examples` (jsonb)
- `task_submissions`: add `proof_text`
- `payments`: ensure `type` supports `activation` | `deposit` | `withdrawal`
- `referral_earnings` table (referrer_id, referred_id, amount, status)
- `payment_methods` table (admin-configured deposit instructions shown to users)
- `notification_preferences` on profiles (jsonb)
- RLS: users can SELECT/INSERT own rows; admin policies stay
- Storage bucket `proofs` (public read, authed write) for submission/appeal images
- Storage bucket `avatars` (public)
- DB trigger on signup: auto-create profile with referral_code
- DB function `activate_account(payment_id)` for admin to call (already covered by admin payment approval flow)

## Phased delivery

**Phase 1 — Foundation (this turn):**
1. DB migration (schema + bucket + trigger)
2. Auth pages (login/register with username, email, phone, password, optional referral code) + Google OAuth
3. `_user` layout, sidebar, topbar, auth guard, role-aware redirect
4. Dashboard page (stat cards, status badge, lock overlay for inactive)
5. Profile page with Account Activation form (24h cooldown)

**Phase 2:** Browse Tasks, Task Details, Submission Flow, My Submissions, Appeals

**Phase 3:** Wallet, Deposit, Withdraw (with admin payment methods displayed)

**Phase 4:** Publish Task (4 tabs: Create/My Tasks/Reviews/Analytics) with balance hold + tax from settings

**Phase 5:** Referrals, Notifications, Settings, polish (animations, skeletons, empty states, mobile drawer)

## Design

Reuses existing dark token system in `src/styles.css` (purple/blue primary, emerald success, red destructive). Adds gold accent token for rewards, glassmorphism utility class, gradient utility for hero cards. Framer-motion for page/card transitions.

## What I need from you

1. **Approve this plan** so I can start Phase 1.
2. **Confirm referral bonus amount** — flat USD per activated referral, or % of activation fee? (I'll default to a configurable `settings.referral_bonus` column unless you say otherwise.)
3. **Google sign-in OK?** Default per Lovable Cloud is email/password + Google. Say "email only" to skip Google.

After your approval I'll execute Phase 1 in one batch (migration + ~10 files), then continue phase by phase.
