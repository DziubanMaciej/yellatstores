# Hosting tutorial: stores.yellatcomputers.com

## How it works

- Your GitHub account `DziubanMaciej` can host any number of **project sites**, one per repo.
  `DziubanMaciej/yellatcomputers` is one of them, and it claims the domain
  `yellatcomputers.com` (+ `www`).
- `DziubanMaciej/yellatstores` will be another one, claiming `stores.yellatcomputers.com`.
- DNS at Hostinger sends both names to GitHub's servers:
  - the apex goes through the `A`/`ALIAS @` records you already have
  - the subdomain goes through a new `CNAME stores` record
- GitHub looks at which hostname the browser asked for and serves the matching repo.
- The two sites don't affect each other.
- GitHub gets a free HTTPS certificate (Let's Encrypt) for each name automatically.

```
browser ── stores.yellatcomputers.com ──► Hostinger DNS: CNAME stores → dziubanmaciej.github.io
                                                   │
                                                   ▼
                              GitHub Pages: "who claims stores.yellatcomputers.com?"
                                                   │
                                                   ▼
                                    repo DziubanMaciej/yellatstores
```

Constraints:
- The repo must be **public** (free GitHub plan), so the data is public. You accepted this.
- The site is deployed by a **GitHub Actions** workflow (`.github/workflows/pages.yml`).
  It publishes `site/` + `data/` only. `docs/`, `scripts/` and `test/` stay out of the site,
  but they're still visible in the public repo.

## Your current DNS (for reference)

| Type | Name | Points to |
|------|------|-----------|
| CNAME | www | DziubanMaciej.github.io |
| ALIAS | @ | DziubanMaciej.github.io |
| A ×4 | @ | 185.199.108–111.153 (GitHub Pages IPs) |

Leave all of this as is. (Having both `ALIAS @` and `A @` is redundant, but it works. Don't
touch it as part of this.)

As of 2026-10-20 the domain is **not verified** in your GitHub account: there's no
`_github-pages-challenge-…` TXT record. Step 1 fixes that. Without it, someone else could
point a dangling subdomain at their own Pages site.

## Steps

Do them in this order: claim the domain on GitHub first, then point DNS at it. Done the
other way round, there's a short window where someone else could claim `stores.` on GitHub.

### 1. Verify yellatcomputers.com in your GitHub account (one-time, about 5 min)
1. github.com → your avatar → **Settings** → left menu **Pages** (the account-level settings,
   not a repo's) → **Add a domain** → enter `yellatcomputers.com` → **Add domain**.
2. GitHub shows a TXT record: a name like `_github-pages-challenge-DziubanMaciej` and a
   random value.
3. Hostinger hPanel → **Domains** → *yellatcomputers.com* → **Manage** → **DNS / Nameservers**
   → **Manage DNS records** → add:
   - Type `TXT`
   - Name `_github-pages-challenge-DziubanMaciej` (only that part, without `.yellatcomputers.com`)
   - Value: the code from GitHub
   - TTL: default
4. Wait a few minutes, then click **Verify** on GitHub. If it fails, wait longer (up to a few hours) and retry.
5. **Never delete this TXT record.** This also protects `stores.` and any other direct subdomain.

### 2. Push the repo with the deploy workflow
1. Create the public repo `DziubanMaciej/yellatstores` on GitHub and push `master`. The repo must
   already contain `.github/workflows/pages.yml` (added in Phase 8). It runs on every push to
   `master`, and can also be started by hand: Actions tab → *Deploy Pages* → **Run workflow**.
2. Repo → **Settings** → **Pages** → **Build and deployment** → Source: **GitHub Actions**.
3. Repo → **Actions** tab: the "Deploy Pages" run should go green. The site is now at
   `https://dziubanmaciej.github.io/yellatstores/`.
   - It may redirect or look odd until step 3, because your account already uses custom domains. That's fine.

### 3. Attach the custom domain on GitHub
1. Repo → **Settings** → **Pages** → **Custom domain**: `stores.yellatcomputers.com` → **Save**.
2. With Actions deploys, no `CNAME` file is needed in the repo. This setting is what counts.
3. GitHub will show "DNS check unsuccessful" until step 4 is done. That's expected.

### 4. Add the DNS record at Hostinger
hPanel → Domains → yellatcomputers.com → DNS / Nameservers → **Manage DNS records** → add:

| Type | Name | Points to | TTL |
|------|------|-----------|-----|
| CNAME | `stores` | `DziubanMaciej.github.io` | 14400 (same as the others) |

Watch out for:
- Name is just `stores`.
- Target is the bare `DziubanMaciej.github.io`, **without** `/yellatstores`.
- Don't point it at `yellatcomputers.com`.
- Don't create `stores` under hPanel's *Subdomains* (hosting) page, because that adds records pointing at
  Hostinger's servers instead. Only use the DNS records editor.
- Keep Hostinger's default `CAA` records. They allow Let's Encrypt, which GitHub needs for HTTPS.

### 5. Check
- Online: https://dns.google/query?name=stores.yellatcomputers.com&rr_type=CNAME should
  show `dziubanmaciej.github.io.`
- Or in a terminal (`dig` isn't installed here; on Arch it's in the `bind` package):
  `curl -s "https://dns.google/resolve?name=stores.yellatcomputers.com&type=CNAME"`
- Usually minutes, at most a few hours (TTL 14400 = 4h, only matters if you got it wrong
  and have to fix it).
- Back in repo → Settings → Pages, the custom-domain box should say **DNS check successful**.

### 6. Enable HTTPS
Repo → Settings → Pages → tick **Enforce HTTPS**. If it's greyed out, GitHub is still getting
the certificate. Wait (usually under an hour, at most 24h) and retry.

Done: https://stores.yellatcomputers.com

## Running the site locally
`node scripts/serve.js` serves it at http://localhost:8000/ with the same layout as deployed
(`site/` at the root, `data/` at `/data/`). Pass another port as an argument if 8000 is taken:
`node scripts/serve.js 8080`. Data and code changes show up on a plain reload.

## Day-to-day
- Change data/code locally → `npm test` → commit → `git push`. Actions redeploys in about 1 minute.
- GitHub Pages caches files for about 10 minutes (`max-age=600`). The site fetches JSON with
  `cache: 'no-cache'` to avoid stale data. JS/CSS changes may need a hard refresh on the phone.

## Troubleshooting
| Symptom | Likely cause |
|---------|--------------|
| "Domain is already taken" when saving the custom domain | Another repo has it set. Remove it there. |
| Site shows 404 at stores. | The workflow didn't run or failed (Actions tab), or Source isn't set to *GitHub Actions*. |
| Browser certificate warning | HTTPS cert not issued yet. Wait, and make sure no stray `A` record exists for `stores`. |
| yellatcomputers.com broke | Shouldn't happen, since nothing here touches `@`/`www`. Check you didn't edit those records. |

## Sources
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
- https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://www.hostinger.com/support/?p=554
- https://support.hostinger.com/en/articles/5950464-how-to-manage-caa-records
