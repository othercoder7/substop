# Subscription Import Strategy

## What we cannot do

There is no universal iPhone or Android permission that exposes every third-party subscription on a user's device.

SubStop cannot simply ask the OS for all active subscriptions from other companies like Netflix, Spotify, or ChatGPT.

## Realistic import options

### 1. Email import

Best early option.

- User connects Gmail or another mailbox
- SubStop scans renewal receipts and billing notices
- App turns matching emails into subscription suggestions
- User confirms or rejects each suggestion

Pros:

- High signal for real subscriptions
- Good user trust when suggestions are review-first
- Works well for receipts and trial-ending notices

Cons:

- Needs OAuth and careful privacy messaging
- Parsing email formats takes iteration

### 2. Bank or card import

Best for broader subscription detection.

- User connects bank or card accounts through Plaid or similar
- SubStop finds recurring merchants
- App surfaces likely subscriptions for review

Pros:

- Catches services even when receipts are missing
- Helps estimate true monthly spend

Cons:

- More sensitive permissions
- Merchant normalization is messy
- Can confuse subscriptions with other recurring charges

### 3. Screenshot or forwarded-email import

Good lightweight fallback.

- User uploads a billing screenshot or forwards an email
- App extracts merchant, amount, and renewal date
- User reviews before saving

## Recommended rollout

### MVP

- Manual entry
- Renewal reminders
- Settings toggle for notifications

### v1.5

- Gmail import
- Review queue for detected subscriptions

### v2

- Bank import with recurring-charge detection
- Confidence scoring and dedupe

## Data model to add later

When import work starts, add:

- `import_connections`
- `import_candidates`
- `import_candidate_reviews`

That lets SubStop keep imported suggestions separate from confirmed subscriptions.
