# Captured Living: setup guide

Follow the parts in order. Each step says **where** you do it:
🌐 the GitHub website, 💻 the Terminal on your Mac, or 🖥️ on the VPS (logged in over SSH).

When you're done, every PicPeak update arrives as a pull request on Monday.
Merging it builds your images and deploys them to the VPS with a database
backup first and an automatic rollback if the portal doesn't come up.

**Never paste a private key, token or password into a chat.** They only go
into GitHub's Secrets page or files on your own machines.

---

## Part 1: GitHub repository (about 15 minutes)

### 1.1 Turn off PicPeak's release workflows 🌐

These release PicPeak itself, not your portal; in your fork they only fail or
create stray releases. Disable them (don't delete them, so PicPeak updates
keep merging cleanly).

1. Open https://github.com/DarkUnScripted/CapturedLivingClientPortal/actions
2. In the left sidebar click the workflow, then the **⋯** button at the top
   right, then **Disable workflow**. Do this for each of:
   - Release Please
   - Release Please (Beta)
   - Cut Stable Release (daily batch)
   - What's New highlights
   - Updater image

Leave the others on (Build and Push Docker Images, Tests, E2E, and so on).

### 1.2 Create the token for the weekly sync 🌐

1. Open https://github.com/settings/personal-access-tokens/new
2. Fill in:
   - **Token name:** `CapturedLiving upstream sync`
   - **Expiration:** 1 year (add a calendar reminder to renew it)
   - **Resource owner:** DarkUnScripted
   - **Repository access:** Only select repositories → `CapturedLivingClientPortal`
   - **Permissions → Repository permissions:**
     - Contents: **Read and write**
     - Pull requests: **Read and write**
     - Workflows: **Read and write**
     (Metadata: Read-only is added automatically.)
3. Click **Generate token** and copy it. GitHub shows it only once.

### 1.3 Save it as a repository secret 🌐

1. Open https://github.com/DarkUnScripted/CapturedLivingClientPortal/settings/secrets/actions
2. **New repository secret** → Name `SYNC_TOKEN`, Secret: paste the token → **Add secret**.
3. Test it: Actions → **Sync from PicPeak** → **Run workflow**. It either
   opens a pull request or reports that main is up to date. Both mean it works.

### 1.4 Make your images public 🌐

Your repository is public, so making the images public exposes nothing new,
and the VPS can download them without logging in.

1. Open https://github.com/DarkUnScripted?tab=packages
2. Click **capturedlivingclientportal/backend** → **Package settings** (right side)
   → **Danger Zone → Change visibility** → **Public** → confirm with the name.
3. Do the same for **capturedlivingclientportal/frontend**.

---

## Part 2: The VPS (about 30 minutes)

Log in the way you do today, for example 💻 `ssh root@YOUR_VPS_IP`.
Commands marked 🖥️ run there. `sudo` is only needed if you're not root.

### 2.1 Find your PicPeak folder and current version 🖥️

```bash
docker inspect picpeak-backend --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}'
```

Note the folder it prints (for example `/opt/picpeak`). This guide calls it
**PROJECT_DIR**. Then check which image runs now:

```bash
docker inspect picpeak-backend --format '{{ .Config.Image }}'
```

`ghcr.io/picpeak/picpeak/backend:stable` means you're on PicPeak's stable line
(3.134.x). Your fork follows the newer beta line (3.167+), so the first deploy
upgrades the database one way. That's why Part 4 starts with a backup.

### 2.2 Keep your own server tweaks safe 🖥️

From now on each deploy installs the repo's `docker-compose.production.yml`.
If you ever edited that file on the server (ports, a reverse proxy, extra
volumes), compare it with the repo version first:

```bash
cd PROJECT_DIR
curl -fsSL https://raw.githubusercontent.com/DarkUnScripted/CapturedLivingClientPortal/main/docker-compose.production.yml | diff - docker-compose.production.yml
```

No output means no edits. If there are differences you made yourself, move
them into a new file `docker-compose.local.yml` (only the changed keys under
`services:`) and add it to the end of `COMPOSE_FILE` in step 2.3. Ask Claude
for help if unsure.

### 2.3 Point the server at your images 🖥️

```bash
cd PROJECT_DIR
cp .env .env.before-captured-living
curl -fsSLO https://raw.githubusercontent.com/DarkUnScripted/CapturedLivingClientPortal/main/docker-compose.captured-living.yml
```

Open `.env` (`nano .env`) and add at the end:

```bash
COMPOSE_FILE=docker-compose.production.yml:docker-compose.captured-living.yml
CL_IMAGE_TAG=main
```

If you use the face-detection feature, also add `COMPOSE_PROFILES=faces`.
Don't start anything yet; Part 4 does that.

### 2.4 Create a `deploy` user for GitHub 🖥️

GitHub logs in as this user, never as root.

```bash
sudo adduser --disabled-password --gecos "" deploy
sudo usermod -aG docker deploy
sudo chgrp deploy PROJECT_DIR PROJECT_DIR/.env PROJECT_DIR/docker-compose*.yml
sudo chmod g+rw PROJECT_DIR PROJECT_DIR/.env PROJECT_DIR/docker-compose*.yml
sudo -u deploy mkdir -p PROJECT_DIR/backups/pre-deploy
```

Being in the `docker` group is effectively root on that server, so the key in
the next step must stay private: it lives only on your Mac and in GitHub Secrets.

### 2.5 Make the deploy key 💻

On your Mac (Terminal):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/captured_living_deploy -C "github-actions-deploy" -N ""
```

Show the **public** half (the `.pub` file, safe to copy):

```bash
cat ~/.ssh/captured_living_deploy.pub
```

### 2.6 Allow that key on the VPS 🖥️

Replace `PASTE_PUBLIC_KEY` with the whole line from step 2.5 (starts with `ssh-ed25519`):

```bash
sudo -u deploy mkdir -p -m 700 /home/deploy/.ssh
echo 'PASTE_PUBLIC_KEY' | sudo -u deploy tee -a /home/deploy/.ssh/authorized_keys
sudo -u deploy chmod 600 /home/deploy/.ssh/authorized_keys
```

Then print the server's fingerprint, to check in the next step:

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

### 2.7 Test the login 💻

```bash
ssh -i ~/.ssh/captured_living_deploy deploy@YOUR_VPS_IP docker ps
```

The first time, it shows a fingerprint: it must match step 2.6. Type `yes`.
You should see your PicPeak containers. If you see "Permission denied", recheck
step 2.6.

---

## Part 3: Deploy settings in GitHub (about 10 minutes) 🌐

Open https://github.com/DarkUnScripted/CapturedLivingClientPortal/settings/secrets/actions

**Secrets** tab → **New repository secret** for each:

| Name | Value | How to get it 💻 |
| --- | --- | --- |
| `VPS_HOST` | your VPS IP or hostname | |
| `VPS_USER` | `deploy` | |
| `VPS_SSH_KEY` | the **private** key | `pbcopy < ~/.ssh/captured_living_deploy` copies it, then paste |
| `VPS_KNOWN_HOSTS` | the server's identity | `ssh-keyscan -t ed25519 YOUR_VPS_IP \| pbcopy`, then paste |

**Variables** tab → **New repository variable**:

| Name | Value |
| --- | --- |
| `VPS_PROJECT_DIR` | PROJECT_DIR from step 2.1 |
| `VPS_SSH_PORT` | only if SSH isn't on port 22 |

Don't add `AUTO_DEPLOY` yet.

Optional: to approve each deploy by hand, open Settings → **Environments** →
`production` (it appears after the first deploy run) → **Required reviewers** →
add yourself.

---

## Part 4: First deploy (do this together with Claude)

1. **Back up everything** 🖥️ (database and photos, with PicPeak's own script):
   ```bash
   cd PROJECT_DIR && ./scripts/backup.sh
   ```
   If that script isn't in your folder, at least dump the database:
   ```bash
   cd PROJECT_DIR && docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > first-deploy-backup.dump
   ```
   Also take a snapshot in your VPS provider's control panel if it offers one.
2. 🌐 Actions → **Deploy to VPS** → **Run workflow** → tag `main` → **Run**.
3. Watch the run. It backs up the database, installs the compose files, pulls
   your images, restarts, and waits up to 10 minutes for the backend to be healthy.
4. Open your portal: log in to the admin, open a gallery, open the client portal.

When it all works, turn on automatic deploys: Settings → Secrets and variables →
Actions → **Variables** → New repository variable `AUTO_DEPLOY` = `true`.

---

## Part 5: Day to day

- **Monday:** a pull request "chore(sync): merge PicPeak x.y.z" appears.
  When its checks are green, merge it with **Create a merge commit**.
  (GitHub's **Sync fork** button on the repo page does the same thing.)
- **Then automatically:** images build (about 5 minutes), then the deploy runs.
  GitHub emails you if any step fails.
- **Merge conflicts:** if the pull request says it has conflicts, ask Claude
  to resolve them.

### Rolling back

1. 🌐 Actions → **Deploy to VPS** → **Run workflow** → enter the previous
   build's tag, `sha-` plus the first 7 characters of its commit
   (for example `sha-3637a99`).
2. If the bad version changed the database and the old one won't start,
   restore the backup taken just before the deploy 🖥️:
   ```bash
   cd PROJECT_DIR
   ls backups/pre-deploy/        # newest folder = just before the bad deploy
   docker compose stop backend
   docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < backups/pre-deploy/FOLDER/database.dump
   docker compose up -d
   ```

The last 10 pre-deploy backups are kept in `PROJECT_DIR/backups/pre-deploy/`.
They hold the database and `.env`, not photos, so keep your regular backups too.

---

## Troubleshooting

Found during our own first deploy (October 2026), when the VPS moved from a
source install (`git clone` + `docker-compose.yml`, 3.114) to our images:

- **`container picpeak-postgres is unhealthy`.** A source install keeps the
  database in a `pgdata` subfolder of its volume; the production file expects
  the volume root. `docker-compose.captured-living.yml` sets `PGDATA` to the
  subfolder, so this is handled. Check with
  `ls /var/lib/docker/volumes/picpeak_postgres-data/_data` (shows only `pgdata`).
- **Backend restarts in a loop right after "All migrations completed
  successfully", with no error.** In production the backend logs only to files
  and exits before writing a startup error. Show it on screen with:
  ```bash
  cd PROJECT_DIR && timeout 120 docker compose run --rm --no-deps -e LOG_TO_CONSOLE=true backend 2>&1 | tail -40
  ```
- **`JWT_SECRET must contain at least 32 characters`.** Newer PicPeak refuses
  short keys. Replace it with `openssl rand -hex 32`, and keep the old value as
  `GALLERY_PASSWORD_ENCRYPTION_KEY` so stored gallery passwords stay readable.
  Everyone has to log in again.
- **Port 3001 no longer answers from the internet.** Intended: the production
  file binds the backend to the server itself. The website reaches it through
  the frontend on port 3000.
