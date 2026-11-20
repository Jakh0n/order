# Database backup

`.github/workflows/db-backup.yml` dumps the `public` schema (all app data + `_prisma_migrations`) every day at
02:30 UTC, encrypts it with a passphrase and keeps it as a GitHub Actions artifact for 30 days.
Menu images and receipts live in Supabase Storage and are **not** in this backup.

## Setup (once)

```bash
# Database URL: DIRECT_URL from .env (session pooler, port 5432)
gh secret set BACKUP_DATABASE_URL
# Passphrase: a long random one. Save it in a password manager: without it the backups can't be opened.
gh secret set BACKUP_PASSPHRASE
```

Run it once by hand to check: `gh workflow run db-backup.yml`, then `gh run list --workflow=db-backup.yml`.

GitHub turns off scheduled workflows in a public repo after 60 days without commits. If that happens,
enable it again in Actions → Database backup.

## Restore

Restore into a **new, empty** database first (a new Supabase project), check it, then switch `DATABASE_URL` /
`DIRECT_URL` over. Don't restore over the live database.

```bash
gh run list --workflow=db-backup.yml            # pick a run
gh run download <run-id> -D restore             # needs gh auth
gpg --decrypt restore/*/db-*.dump.gpg > db.dump # asks for the passphrase
pg_restore --no-owner --no-privileges -d "<new database URL, port 5432>" db.dump
```

`pg_restore` must be version 17 or newer (`brew install postgresql@17`, or the `postgres:17` Docker image).
Delete `db.dump` when you're done: it holds customer names and phone numbers.
