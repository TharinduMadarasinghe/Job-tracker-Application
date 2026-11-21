# Job Application Tracker

Three parts, one REST API:  backend (Laravel + MS SQL Server) · web (Next.js) · mobile (Expo React Native)

## 1. Backend
Prereqs: PHP 8.2+, Composer, SQL Server, Microsoft ODBC Driver 18, and the `pdo_sqlsrv` PHP extension
(enable `extension=pdo_sqlsrv` in php.ini).

    composer create-project laravel/laravel backend-app
    cd backend-app
    php artisan install:api            # installs Sanctum

Copy the files from `backend/` into `backend-app/` (merge folders; overwrite routes/api.php).

1. In `app/Models/User.php` add:  `use Laravel\Sanctum\HasApiTokens;`  and put `HasApiTokens` in the `use` list inside the class.
2. In SQL Server create an empty database:  `CREATE DATABASE job_tracker;`
3. In `.env`:

       DB_CONNECTION=sqlsrv
       DB_HOST=127.0.0.1
       DB_PORT=1433
       DB_DATABASE=job_tracker
       DB_USERNAME=sa
       DB_PASSWORD=YourPassword
       DB_TRUST_SERVER_CERTIFICATE=true

4. `php artisan migrate` then `php artisan serve --host=0.0.0.0`  (runs on :8000)

### Endpoints
| Method | Path | Notes |
|---|---|---|
| POST | /api/register, /api/login | returns `token` |
| POST | /api/logout | |
| GET | /api/applications?search=&status= | paginated |
| POST | /api/applications | company, position, status?, location?, applied_date?, notes? |
| GET/PUT/DELETE | /api/applications/{id} | |
| GET | /api/applications/stats | total + count per status |

Send `Authorization: Bearer <token>` on everything except register/login.

## 2. Web
    npx create-next-app@latest web-app --typescript --tailwind --app --src-dir
Copy `web/src/*` over `web-app/src/`, then `npm run dev` (http://localhost:3000, register at /login).
Optional: `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000/api`

## 3. Mobile
    npx create-expo-app@latest mobile-app --template blank-typescript
Replace `App.tsx` with `mobile/App.tsx`, set `API` at the top (emulator 10.0.2.2, real phone → your PC's IP), run `npx expo start`.
Register a user on the web first (the mobile demo only has login).
