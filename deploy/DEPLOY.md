# Deploying the CAJDEN website (infocajden.org on Hostinger)

The live site keeps the built React site and the PHP backend together in one web root
(`public_html`): `index.html`, `assets/`, `api/`, `includes/`, `uploads/` and so on.
A release zip has exactly that shape, so deploying means unzipping it over `public_html`.

## 1. Build the release (on your computer)

```bash
git pull                     # make sure you have the latest code
node deploy/build.mjs
```

This checks that everything is committed and that `frontend/.env` points at the live API, builds
the site, and writes `deploy/releases/cajden-<date>-<commit>.zip`.

The zip **never** contains `.env` files or uploaded photos, so it can't overwrite the live
passwords or anyone's uploads.

## 2. Back up the live site (2 minutes, do it every time)

In **hPanel**:

1. **Files → Backups**, or File Manager: right-click `public_html` → *Compress* to make a zip of it.
2. **Databases → phpMyAdmin**: select the database → *Export* → *Go*.

If anything goes wrong you can put these back (see step 6).

## 3. Upload

1. hPanel → **File Manager** → open `public_html`.
2. **Upload** the release zip.
3. Right-click it → **Extract** → into `public_html` (the current folder). Allow it to **overwrite**.
4. Delete the uploaded zip afterwards.

Leave these alone; the release doesn't replace them:
- `.env`: the live database and Gmail passwords.
- `uploads/`: all photos, PDFs and covers people have uploaded.

Old files in `assets/` from previous releases are harmless; you can delete files there older
than today if you want to tidy up.

## 4. Check the live `.env`

File Manager → `public_html/.env` → *Edit*. Compare with `env.example.txt` from the release.
Make sure it has:

```
APP_FRONTEND_URL=https://infocajden.org
GMAIL_ADDRESS=...
GMAIL_APP_PASSWORD=...        # a valid 16-character Google App Password
CONTACT_RECEIVER_EMAIL=...
MAIL_FROM_NAME=CAJDEN Inc.
APP_TIMEZONE=Asia/Manila      # optional, this is the default
```

Then delete `env.example.txt` from `public_html`.

## 5. Database

New columns (FBPO photos, programs, E-News drafts and mailing, album visibility, materials links,
email replies, login lockout) are **added automatically** the first time each part of the site is
used. Nothing to run.

One-time fix for old posts saved with an empty event date (safe to run more than once).
phpMyAdmin → SQL:

```sql
UPDATE posts SET event_date = NULL WHERE event_date = '0000-00-00 00:00:00';
```

(The SQL files in `migrations/` do the same column changes by hand, if you ever prefer that.
Each can only be run once.)

## 6. Check it works

Open https://infocajden.org in a private window:

- [ ] Home, About, Programs, News, Photos, E-News, Materials, Contact all load.
- [ ] Reloading a deep link (e.g. https://infocajden.org/about) still works.
- [ ] https://infocajden.org/.env and https://infocajden.org/includes/env.php show **403 Forbidden**.
- [ ] `/admin/login` works; the dashboard loads.
- [ ] Admin → Contact Messages → **Send test email** arrives (check spam too).
- [ ] Send a message from the Contact page: it appears in the admin and in the Gmail inbox.
- [ ] Link previews: paste https://infocajden.org and a news article link into the
      [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) and press
      **Scrape Again**. Each should show its own title and image.

Everyone is logged out once after this release (the login cookie got stricter). That's expected.

## Rolling back

Extract the backup zip from step 2 over `public_html` (and import the database export in
phpMyAdmin if the database was changed). Or rebuild an earlier commit:
`git checkout <commit> && node deploy/build.mjs --allow-dirty`, then `git checkout main`.

## Link previews (the image when a link is shared)

`index.php` in the web root adds the title, description and image for the page being shared:
articles use their cover photo, E-News issues their cover, albums their first photo, and every
other page the site card `og-image.jpg` (1200×630). Facebook and Messenger cache previews for
days; after changing a post's cover, use the Sharing Debugger's **Scrape Again** to refresh it.

## Email troubleshooting

`Gmail rejected the login` means the App Password is wrong or was revoked:
create a new one at https://myaccount.google.com/apppasswords (2-Step Verification must be on),
paste all 16 letters into `GMAIL_APP_PASSWORD` in `public_html/.env`, and send a test email again.
