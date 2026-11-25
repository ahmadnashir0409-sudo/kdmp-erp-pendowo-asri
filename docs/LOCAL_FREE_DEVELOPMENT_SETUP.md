# Local Free Development Setup — Multi-KDMP

This workflow avoids paid Supabase cloud development branches. It does not change production.

## Requirements
- Windows 10/11
- Docker Desktop (WSL 2 backend recommended)
- Node.js LTS
- Git
- Supabase CLI

## One-time setup
1. Install Docker Desktop and start it.
2. Install Node.js LTS and Git if missing.
3. Open PowerShell and run:
   ```powershell
   npm install --global supabase
   supabase --version
   docker version
   ```
4. Clone the repository and enter its folder:
   ```powershell
   git clone https://github.com/ahmadnashir0409-sudo/kdmp-erp-pendowo-asri.git
   cd kdmp-erp-pendowo-asri
   git checkout feature/multi-kdmp-foundation
   ```
5. Start local Supabase services:
   ```powershell
   supabase start
   ```
6. Inspect the local Studio URL, API URL, anon/publishable key, and database URL printed by the CLI. Do not paste service_role/secret keys into chat or frontend code.

## Local migration workflow
- Inspect current migration history and compare it with the checked-in supabase/migrations directory.
- Use a local database only for schema experiments and automated tests.
- Do not run `supabase db push`, `supabase migration up`, or any SQL write against the production project during this phase.
- Do not reset or seed production.
- For a fresh local database, use `supabase db reset` only after confirming the local container is the target; this resets local development data.
- Build tenant migrations in small, reversible steps. Backfill existing rows to Pendowo Asri only after verifying relationship ownership and row counts.
- Test two tenants with different users. Verify that tenant A cannot read or mutate tenant B data, including via RPCs, nested child tables, DABU, and storage.

## Current project caveats
- The live project is `srfhamdyewblyuangxzz`. Never point local experimentation commands at this project.
- The existing repository has migration files in `supabase/migrations`; compare all migration versions with the remote migration history before generating a baseline.
- The application currently hardcodes the production Supabase URL/key in app.js. Do not change production config as part of local setup. Before local UI testing, create a separate local-only config mechanism and ensure it cannot be committed with production secrets.
- Current app is static HTML/CSS/JS. Supabase CLI local stack can host the database/API/functions, but the frontend must be explicitly configured to use local API URL and local publishable key.
- Edge Functions that call external AI/email providers need their secrets configured locally. Keep DABU disabled in local tests if OPENAI_API_KEY is unavailable; do not block ERP core tests.

## Release gate
No second cooperative goes live until RLS isolation, tenant-safe foreign keys/RPCs, role matrix, POS/inventory/journal/invoice/loan regression tests, and invitation lifecycle tests all pass.
