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
