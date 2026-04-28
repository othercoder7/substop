# substop

SubStop is an app that helps users track active subscriptions, upcoming renewals, and recurring monthly spending.

## MVP
- User authentication
- Add subscriptions manually
- View active subscriptions
- See monthly and yearly totals
- Get reminders before renewal dates
- Mark subscriptions for cancellation or review
- Start email import with Gmail

## Tech Stack
- Frontend: TBD
- Backend: TBD
- Database: TBD

## Getting Started
1. Clone the repo
2. Install dependencies
3. Create a `.env` file from `.env.example`
4. Run the app locally

## Environment Variables
See `.env.example` for required variables.

## Email Import
- Run `supabase/import_schema.sql`
- Set `EXPO_PUBLIC_API_BASE_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY`
- Gmail OAuth now exchanges the code and saves the connected inbox to `import_connections`
- Mailbox sync and candidate generation are the next step

## Stable Gmail OAuth Setup
- Use EAS Hosting for the Expo Router API routes instead of a temporary tunnel
- Keep `app.json` on `web.output: "server"` so API routes are included in the server bundle
- Deploy once with EAS Hosting to get a stable URL like `https://your-subdomain.expo.app`
- Set `EXPO_PUBLIC_API_BASE_URL` to that stable hosted URL
- Register this exact Google redirect URI once: `https://your-subdomain.expo.app/api/email-import/google/callback`
- Keep `GOOGLE_CLIENT_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and other secrets only in local env or Expo/EAS server env settings

## New Laptop Setup
1. Clone the repo and check out the `dev` branch.
2. Install dependencies with `npm install`.
3. Recreate `.env` from `.env.example`.
4. Set `EXPO_PUBLIC_API_BASE_URL=https://substop-app.expo.app`.
5. Add the same local secrets used on the previous machine:
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
6. Log in again where needed:
   `npx eas-cli@latest whoami` to confirm Expo/EAS access.
7. Start the app with `npm start`.

Notes:
- Gmail OAuth no longer depends on a local tunnel. The stable callback URL is `https://substop-app.expo.app/api/email-import/google/callback`.
- Hosting env vars for `production` and `preview` are already configured in Expo/EAS, but the local `.env` still needs to exist on each machine.
- Do not commit `.env` or any credentials JSON files.
