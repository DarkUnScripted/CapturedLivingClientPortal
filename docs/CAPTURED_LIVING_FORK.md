# Captured Living fork

This repository is a fork of [PicPeak](https://github.com/PicPeak/picpeak).
We follow PicPeak's `main` for new features and fixes, add our own branding
on top, and deploy images we build ourselves.

## The rules that keep updates painless

1. **Theme in Branding first.** Colours, fonts, header, layout, logo and custom
   CSS are set in Admin → Branding and live in the database, so code updates
   never touch them. Only reach for code when Branding can't do it.
2. **Our code lives in our own files.** New components, styles
   (`frontend/src/styles/captured-living.css`) and assets
   (`captured-living-*`) are new files. Edits to PicPeak's files are kept to
   the one line that wires ours in. Never edit `tokens.css`,
   `docker-compose.production.yml`, `CHANGELOG.md` or `package.json` versions.
3. **Our commits start with `brand:`**, so `git log --grep '^brand:'` lists
   everything we have changed.
4. **Merge, never rebase or squash** upstream into `main`.

Fork-only files (PicPeak doesn't have them, so they never conflict):

| File | Purpose |
| --- | --- |
| `docker-compose.captured-living.yml` | Points the server at our images |
| `.github/workflows/upstream-sync.yml` | Weekly pull request with PicPeak's newest `main` |
| `docs/CAPTURED_LIVING_FORK.md` | This page |

## Getting updates

The **Sync from PicPeak** workflow opens a pull request `chore(sync): merge
PicPeak <version>` every Monday (or run it from the Actions tab). Check the
tests, then merge it with **Create a merge commit**.

If GitHub reports conflicts, resolve them locally:

```bash
git fetch upstream
git switch main && git pull
git merge upstream/main
# fix the conflicts: keep PicPeak's change and re-add our one wiring line
git commit
git push
```

One-time local setup for that:

```bash
git remote add upstream https://github.com/PicPeak/picpeak.git
git config rerere.enabled true   # remembers conflict fixes for next time
```

After each update, open a gallery and the client portal and check the theme
still looks right; PicPeak occasionally renames theme settings
(`frontend/src/utils/themeMigration.ts` shows when).

## Images and deploying

`.github/workflows/docker-build.yml` is PicPeak's own workflow. On a fork it
publishes to this repository's packages, so every push to `main` builds:

- `ghcr.io/darkunscripted/capturedlivingclientportal/backend`
- `ghcr.io/darkunscripted/capturedlivingclientportal/frontend`
- `ghcr.io/darkunscripted/capturedlivingclientportal/ml`

each tagged `:main` and `:sha-<short commit>`.

On the server, add to `.env`:

```bash
COMPOSE_FILE=docker-compose.production.yml:docker-compose.captured-living.yml
CL_IMAGE_TAG=main   # or sha-1a2b3c4 to pin one build
```

then deploy with:

```bash
docker compose pull && docker compose up -d
```

To roll back, set `CL_IMAGE_TAG` to the previous `sha-…` tag and run the same
command. Back up the database before every update: PicPeak migrations only go
forward.

Don't enable PicPeak's in-app updater (`profiles: [updater]`). It checks
PicPeak's releases, not ours, so it would offer updates our images don't
contain yet.

## GitHub settings for this fork

- Actions → disable these PicPeak workflows (disable, don't delete, so merges
  stay conflict-free): `release-please.yml`, `release-please-beta.yml`,
  `release-stable-daily.yml`, `whatsnew-highlights.yml`, `updater-image.yml`.
- Settings → Secrets → Actions: add `SYNC_TOKEN` (fine-grained token for this
  repository with Contents, Pull requests and Workflows read/write).
- Packages: make the three images public, or `docker login ghcr.io` on the
  server with a `read:packages` token.
