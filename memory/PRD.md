# MATRIX — Product Requirements Document

## Original Problem Statement
Create a platform named MATRIX where you can create an account, a profile, and an avatar, and create a catalog where I can add live items, promocodes, and a daily challenge for points — like Polytoria, with currency "Brix".

## Architecture
- **Frontend**: React 19 + Tailwind (neo-brutalist / Vibrant Play design), react-router, sonner toasts, axios.
- **Backend**: FastAPI, all routes under `/api`.
- **DB**: MongoDB (users, items, promocodes, challenges).
- **Auth**: Custom JWT username/password. Token in localStorage `matrix_token`, sent as `Authorization: Bearer`.

## User Personas
- **Player**: registers, customizes avatar, buys catalog items with Brix, redeems promocodes, claims daily challenge.
- **Admin**: manages catalog items (image upload), promocodes, and daily challenges via admin panel.

## Core Requirements (static)
- Account + profile + customizable blocky avatar (skin/shirt/pants colors + equipable owned hat/face/gear) with live preview.
- Catalog of "live" items purchasable with Brix currency.
- Promocode redemption for Brix.
- Daily challenge granting Brix (once per UTC day).
- Admin-only management panel.

## Implemented (2026-07-07)
- JWT auth (register/login/me), admin seeding, 500 Brix on signup.
- Catalog listing + category filter, item detail, atomic-ish purchase flow (Brix check, ownership).
- Avatar editor with live preview + equip owned items; profile page with inventory + editable bio.
- Promocode redeem (one-per-user, max-uses). Daily challenge claim (once/day).
- Admin panel: item/promocode/challenge CRUD + stats; image upload via base64.
- Seed data: 6 items, promocodes MATRIX2026 (+250) & WELCOME (+100), active challenge "Daily Login Bonus" (+75).
- Tested: 29/29 backend pass, all frontend flows pass.

## Credentials
- Admin: admin@matrix.com / admin123

## Backlog (prioritized)
- **P1**: Friends/social + trading; item resale marketplace; Brix purchase (Stripe).
- **P1**: Leaderboards; multiple/streak-based challenges; email verification & password reset UI.
- **P2**: Make purchase atomic (find_one_and_update guard); timezone-aware daily reset; profile avatars public sharing.
- **P2**: Split server.py into routers; migrate on_event → lifespan; ProfileInput Pydantic model.

## Next Action Items
- Gather user feedback on avatar depth & economy.
- Consider Brix top-up (Stripe) and a limited-time "sale"/rarity system for items.
