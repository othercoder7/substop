# Notifications Architecture

## MVP now

SubStop can ship renewal reminders with local notifications scheduled on-device.

- User turns renewal reminders on in Settings
- App asks for notification permission
- App reads active subscriptions from Supabase
- App schedules local reminders using each subscription's `renewal_date` and `reminder_days`
- App resyncs reminders whenever subscriptions change or the overview screen reloads

This is fast to ship and good enough for MVP, but it depends on the app opening often enough to resync reminders after edits.

## Recommended production path

Move reminder delivery server-side after MVP.

- Store notification preferences in `public.user_preferences`
- Add push token collection for each signed-in device
- Run a daily Supabase Edge Function or cron job
- Find subscriptions whose reminder windows match today
- Send push notifications through Expo Push or native APNs/FCM
- Log deliveries for debugging and retry handling

## Why server-side later

- More reliable than client-only scheduling
- Works even if the user has not opened the app recently
- Easier to support multiple devices per user
- Makes analytics and delivery troubleshooting possible

## Settings model

Suggested user-level controls:

- `renewal_notifications_enabled`
- `reminder_hour`

Later:

- quiet hours
- per-subscription overrides
- reminder channel choice
