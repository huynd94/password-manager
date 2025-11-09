<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1_RZes9wBZQl1YEBihdpcdAQWTliV5aPA

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend (Password Manager API)

The backend is implemented in `backend/` using Node.js, Express, TypeScript, PostgreSQL, JWT, and bcrypt, following the Zero‑Knowledge design in `BACKEND_SPECIFICATION.md`.

- Copy `backend/.env.example` to `backend/.env` and set:
  - `DATABASE_URL` (or PGHOST/PGUSER/PGPASSWORD/PGDATABASE)
  - `JWT_SECRET`
  - `CORS_ORIGIN` (e.g., `http://localhost:5173`)
- Install backend dependencies: `cd backend && npm install`
- Start backend for development: `npm run dev`

API base URL: `http://localhost:4000/api`

Endpoints:
- `POST /api/register` – register user
- `POST /api/login` – get JWT token
- `GET /api/accounts` – fetch encrypted vault (JWT required)
- `POST /api/accounts` – update encrypted vault (JWT required)

Database init:
- On startup, the server will create the `users` table if it does not exist. You can also run the SQL in `backend/sql/init.sql` manually.

## VPS Deployment (Ubuntu 24.04)

- SSH into your VPS, clone this repo, then run the installer:
  - Without domain: `sudo bash backend/deploy/install.sh`
  - With domain + HTTPS: `sudo bash backend/deploy/install.sh --domain your.domain.com --email you@example.com`
- For updates after pulling new code: `sudo bash backend/deploy/update.sh`
- See details: `backend/deploy/README.md`
