# Vineflow

Multi-organization invoicing / ERP platform. **Phase 1** delivers authentication, organizations, team members, and role-based permissions; the Items, Sales, Purchases, and Reports modules plug into the same permission model in later phases.

## Stack

- **Backend** — FastAPI + SQLAlchemy 2.0 (sync, psycopg3) + Alembic, PostgreSQL. JWT access tokens + rotating, reuse-detecting refresh sessions delivered via httpOnly cookies. Uniform `{success, data, error}` response envelope. Typer management CLI.
- **Frontend** — Next.js (App Router) + Ant Design v6 + Tailwind 4, Zustand + TanStack Query, per-namespace types, centralized theme tokens (light/dark sidebar pane + configurable accent, driven by the org).

## Quick start

```bash
./dev.sh            # Postgres (Docker) + backend + frontend, one command
./dev.sh --seed     # also seed the permission catalog + demo account
```

- Frontend → http://localhost:3000
- API docs → http://localhost:8000/docs
- Demo login → `admin@vineflow.app` / `password123`

> On this machine Postgres is mapped to host port **5433** (a local Postgres already holds 5432). Set `DB_HOST_PORT` to override.

## Layout

```
backend/          FastAPI app (app/modules/{auth,users,orgs,rbac}), Alembic, CLI
frontend/         Next.js app (src/app, src/hooks, src/components, src/types, src/theme)
docker-compose.yml  Postgres
dev.sh            run everything
```

## Backend CLI

```bash
cd backend
uv run vineflow users list
uv run vineflow users create --email you@co.com --password ... --org "Acme" --superuser
uv run vineflow orgs list
uv run vineflow roles list <org>
uv run vineflow db seed
uv run vineflow db prune-sessions
```

## Auth model

Short-lived access JWT (in memory) + opaque refresh token stored server-side (hashed, `refresh_sessions`) and delivered as an httpOnly cookie. Every refresh rotates the token; replaying a revoked token revokes the whole family. Logout revokes; `logout-all` revokes every session for the user.

## RBAC

Users belong to multiple organizations via memberships; each membership has one org-scoped role. Roles map to a global `module:action` permission catalog. Every org is seeded with Super Admin / Admin / Member / Viewer; the org owner is Super Admin. UI and API are both gated by the current user's permissions in the active org (`X-Org-Id` header).
