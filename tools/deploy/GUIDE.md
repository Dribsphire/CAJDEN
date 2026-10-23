# Updating infocajden.org (release __RELEASE__)

Everything is done in Hostinger's **hPanel** (File Manager and phpMyAdmin). No terminal needed.
About 15 minutes. Keep this folder private: `debug.php` contains this release's secret key.

| File | What it is |
| --- | --- |
| `site.zip` | the whole website: pages, `api/`, backend code, empty `uploads/` folders |
| `site/` | the same files unzipped, to look through before uploading |
| `debug.php` | the checker for step 4 (upload it only while checking, then delete it) |
| `env.example.txt` | which settings the live `.env` needs |

`site.zip` has **no** `.env` (passwords) and **no photos**, so extracting it never overwrites the
live settings or anything staff uploaded.

---

## 1. Back up (every time)

1. hPanel › **Files › File Manager** › right-click `public_html` › **Compress** › zip. Download it.
2. hPanel › **Databases › phpMyAdmin** › select the site's database › **Export** › **Go**.

## 2. Upload the new version

1. File Manager › open `public_html`.
2. **Upload** › `site.zip`. Right-click it › **Extract** › into `public_html` (this folder).
   Allow it to **overwrite**.
3. Delete `site.zip` from the server.

Do not delete `public_html/.env` or the `uploads/` folder.

## 3. Check the settings

File Manager › `public_html/.env` › **Edit** (Settings › *Show hidden files* if you don't see it).
Compare with `env.example.txt`. It needs, among others:

```
APP_FRONTEND_URL=https://infocajden.org
GMAIL_ADDRESS=...
GMAIL_APP_PASSWORD=...        (16 letters, from https://myaccount.google.com/apppasswords)
CONTACT_RECEIVER_EMAIL=...
```

Delete `env.example.txt` from `public_html` if it was extracted there.

## 4. Run the checker

1. File Manager › `public_html` › **Upload** › `debug.php` (from this folder).
2. Open:

   **https://infocajden.org/debug.php?key=__DEBUG_KEY__&mail=1**

   It checks PHP, the files, upload folders, `.env`, the database, the API and page routing,
   that private files are blocked, the Gmail login, and shows the last PHP errors.
   It never shows passwords. Every line should say `OK`; each `FAIL` says what to do.
3. **Delete `debug.php` from `public_html`.** (Without the key it already answers "Not found",
   but don't leave it there.)

## 5. Look at the site

Open https://infocajden.org in a private window:

- [ ] Every page loads: Home, About, Programs, News, Photos, E-News, Materials, Contact.
- [ ] `/admin/login` works (everyone is signed out once after an update; that's expected).
- [ ] Admin › Contact Messages › **Send test email** arrives (check spam too).
- [ ] Link previews: paste https://infocajden.org into the
      [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) › **Scrape Again**.

---

## Database changes

New columns are **added automatically** the first time each admin section is used; the checker
(section 5) lists any that haven't been added yet. Nothing to import. Never re-import
`schema.sql` on the live site: it would erase everything staff entered.

## If something goes wrong

- **Blank page or "500"**: run the checker; section 8 shows the last PHP errors
  (also hPanel › Advanced › Error logs).
- **Admin login fails**: `APP_FRONTEND_URL` in `.env` must be exactly `https://infocajden.org`.
- **Emails don't send**: the checker's section 7 says why; usually a new App Password is needed.
- **Roll back**: extract the backup zip from step 1 over `public_html`, and import the database
  export in phpMyAdmin if needed.
