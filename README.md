# Christian Advocates For Justice and Development in Negros — NGO Website Management System

A 5-page NGO website (Home, About, Services, News & Blog, Contact) with a secure
admin panel, built with React (frontend), PHP REST API (backend), and MySQL.

## Project structure

```
ngo-project/
├── backend/          PHP REST API + MySQL
│   ├── api/           Public endpoints (posts, services, officers, offices, contact, settings)
│   ├── api/admin/      Admin-only endpoints (dashboard, messages, reorder officers)
│   ├── config/db.php   Reads DB credentials from .env
│   ├── .env.example    Template — copy to .env and fill in real secrets
│   ├── .env            Your real local secrets (gitignored, not committed)
│   ├── includes/       Shared bootstrap, auth, upload helpers
│   ├── uploads/        Uploaded images (officers, services, posts)
│   └── schema.sql      Full database schema + seed data
└── frontend/          React (Vite)
    └── src/
        ├── pages/       Home, About, Services, NewsBlog, PostDetail, Contact
        ├── pages/admin/ Login, Dashboard, and management screens
        └── components/  Navbar, Footer, OfficeMap (Leaflet), Hierarchy, etc.
```

## 1. Backend setup (XAMPP)

1. Copy the `backend/` folder into `htdocs/ngo-project/backend` (XAMPP), so the
   API is reachable at `http://localhost/ngo-project/backend/api/...`.
2. Start Apache and MySQL in the XAMPP control panel.
3. Open phpMyAdmin, create nothing manually — just import `backend/schema.sql`
   (it creates the `ngo_db` database, all tables, and seed data for you).
4. Copy `backend/.env.example` to `backend/.env` and fill in your real values:
   - `DB_HOST` / `DB_NAME` / `DB_USER` / `DB_PASS` — your MySQL credentials
     (defaults to XAMPP's `root` with no password).
   - `APP_FRONTEND_URL` — must exactly match the URL your React app runs on
     (protocol + host + port, e.g. `http://localhost:5173`). This is what
     controls CORS, so a mismatch here is the #1 cause of CORS errors.
   - `GMAIL_ADDRESS` / `GMAIL_APP_PASSWORD` / `CONTACT_RECEIVER_EMAIL` — see
     step 6 below for how to get a Gmail App Password.

   `backend/.env` is gitignored and holds real secrets — never commit it.
   `backend/.env.example` is the template that's safe to commit.
5. Install PHPMailer (used by the contact form to email your Gmail inbox):
   ```bash
   cd backend
   composer require phpmailer/phpmailer
   ```
   If you don't have Composer, download PHPMailer manually from
   https://github.com/PHPMailer/PHPMailer and adjust the `require` path in
   `api/contact.php` accordingly.
6. Get a **Gmail App Password** for the address you put in `GMAIL_ADDRESS`
   (not your normal Gmail password):
   - Enable 2-Step Verification on the Gmail account.
   - Go to Google Account → Security → App Passwords → generate one for "Mail".
   - Paste that 16-character password into `GMAIL_APP_PASSWORD` in `.env`.

**Default admin login:** username `admin`, password `Admin@12345`
(change this immediately after first login — there's no "change password" UI yet,
so update the `password_hash` column directly, e.g. with `password_hash()` in a
small PHP script, or add a change-password endpoint).

## 2. Frontend setup

```bash
cd frontend
cp .env.example .env   # adjust VITE_API_BASE / VITE_UPLOADS_BASE if your backend URL differs
npm install
npm run dev
```

Visit `http://localhost:5173` for the public site and
`http://localhost:5173/admin/login` for the admin panel.

If your backend runs somewhere other than `http://localhost/ngo-project/backend`,
update `VITE_API_BASE` and `VITE_UPLOADS_BASE` in `frontend/.env`, and
`APP_FRONTEND_URL` in `backend/.env` to match your frontend's actual URL.

## 3. Deploying to Hostinger (or similar shared PHP hosting)

1. Upload the contents of `backend/` to a subdomain or subfolder (e.g. `api.yoursite.org`).
2. Import `schema.sql` via the host's phpMyAdmin, then create `backend/.env`
   (copy from `.env.example`) with the live database credentials, your live
   frontend's URL in `APP_FRONTEND_URL`, and your Gmail SMTP details.
3. Run `npm run build` in `frontend/` (after setting `VITE_API_BASE`/
   `VITE_UPLOADS_BASE` in `frontend/.env` to your live API URL — Vite bakes
   these in at build time, so this must be done *before* building), then
   upload the generated `dist/` folder to your main domain's web root.
4. Make sure `backend/uploads/` is writable (chmod 755) so image uploads work.
5. Double-check `backend/.env` is not web-accessible on your host (it
   shouldn't be served since it doesn't have a `.php` extension, but some
   shared hosts serve dotfiles by default — worth a quick check).

## Notes on the Negros Island office map

The Leaflet map (`OfficeMap.jsx`) is centered on Negros Island by default and
pulls office markers from the `offices` table via `/api/offices.php`. Seed data
includes four sample offices (Bacolod, Dumaguete, Silay, Bais) — edit or add to
these from **Admin → Office Locations**, or directly in `schema.sql` before import.

## Security features already in place

- Passwords hashed with bcrypt (`password_hash` / `password_verify`)
- PHP sessions (httpOnly cookies) gate all admin write endpoints via `requireAuth()`
- All SQL uses PDO prepared statements (no raw string concatenation)
- All text input is sanitized with `htmlspecialchars` before storage
- Image uploads are validated by extension + real MIME type, capped at 5MB,
  renamed to random filenames, and the `uploads/` folder blocks script execution
- CORS is restricted to a single allowed origin (configured via `.env`, not hardcoded)
- Database credentials and Gmail SMTP credentials live in `.env` (gitignored),
  never hardcoded in source or committed to version control

## What's included vs. what to extend

Included: full CRUD for posts (news/blog/events), services, officers (with
drag-based hierarchy reordering), offices (with map sync), contact messages,
site-wide settings, search/filter/pagination on News & Blog, and a working
contact form that emails your Gmail via PHPMailer.

Reasonable next steps for a production launch: an admin "change password" flow,
CSRF tokens on state-changing admin requests, rate-limiting on `/api/contact.php`
and `/api/login.php`, a rich text editor for post content (e.g. TipTap or
Quill) instead of the plain textarea, and image optimization/resizing on upload.
