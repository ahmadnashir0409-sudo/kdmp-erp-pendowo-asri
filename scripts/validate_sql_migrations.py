from pathlib import Path
from pglast import parse_sql

migration_dir = Path("supabase/migrations")
files = sorted(migration_dir.glob("*.sql"))
if not files:
    raise SystemExit("No SQL migration files found.")

errors = []
for path in files:
    try:
        parse_sql(path.read_text(encoding="utf-8"))
        print(f"PASS SQL parse: {path}")
    except Exception as exc:
        errors.append((path, exc))
        print(f"FAIL SQL parse: {path}: {exc}")

if errors:
    raise SystemExit(f"{len(errors)} SQL migration file(s) failed parsing.")

print(f"PASS: parsed {len(files)} migration file(s).")
