# DAGBOEK — Free Development & Regression Environment

## Goal

Develop the multi-KDMP architecture without upgrading Supabase and without using either active Supabase project as a test database.

## Cost and safety boundaries

- No Supabase project or branch is created by this setup.
- No production database credentials or service-role keys are used.
- No production data is copied into tests.
- GitHub Actions uses a temporary PostgreSQL 17 service container for the tenant-isolation smoke test. It is discarded when the job ends.
- GitHub Actions usage is subject to the repository owner's included minutes and platform limits; this workflow does not add a Supabase subscription or compute resource.
- The nusa-pixel-studio and kdmp-erp-pendowo-asri Supabase projects are not modified.

## Checks provided

1. node --check app.js catches JavaScript syntax errors.
2. scripts/validate_sql_migrations.py parses migration SQL with pglast.
3. supabase/tests/tenant_isolation_smoke.sql starts from synthetic Alpha/Beta cooperatives and verifies:
   - an active member sees only their own tenant's inventory;
   - a tenant cannot update another tenant's row;
   - a tenant cannot insert a row into another tenant;
   - a journal line cannot reference an account belonging to another tenant through composite foreign keys.

## Important limitation

The smoke test validates the isolation pattern in a clean PostgreSQL database. It is not a substitute for replaying the complete DAGBOEK schema and all triggers/RPCs. The production schema is not copied here, and no multi-tenant migration is considered production-ready until it has been tested against a complete schema fixture and reviewed.

## How to run locally

Requirements: Node.js 22, Python 3.12, PostgreSQL 17, and psql.

    node --check app.js
    python -m pip install pglast==6.2
    python scripts/validate_sql_migrations.py
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation_smoke.sql

The SQL smoke test creates roles and schemas in the target database. Run it only against a disposable test database, never against production.
