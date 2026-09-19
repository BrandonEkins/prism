# Updating Prism

## From the latest stable release

```bash
cd prism
git pull
./scripts/update.sh
```

The stable path pulls the published GHCR app image instead of rebuilding Next.js on the deployment host. This is substantially faster and avoids exhausting RAM during a local build. Your database, settings, and uploaded files are stored in Docker volumes and are preserved. Database migrations run automatically when the container restarts: no manual `drizzle-kit push` needed.

## Trying a feature branch

Some features are developed on branches before merging to master. To try one:

```bash
cd prism
git fetch origin
git checkout feature/branch-name
./scripts/update.sh --source
```

To go back to the stable release:

```bash
git checkout master
./scripts/update.sh
```

Switching branches rebuilds the app but preserves your data. Feature branches may have rough edges. Use at your own risk.

### Build behavior

`./scripts/update.sh` chooses the fast published-image path on `master`/`main` and the source-build path on other branches. Use `--prebuilt` to force the image path or `--source` to force a local build. Do not use `docker compose down -v`: that removes persistent volumes and can destroy the database and uploaded data.

## Major version notes

Major-version changelogs live in the [changelog](../CHANGELOG.md). Notable upgrade-time behaviors are called out at the top of each release entry.
