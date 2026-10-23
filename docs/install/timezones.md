# Household timezone

The default is `America/Toronto` (EST in winter, EDT in summer). Change `Calendar__TimeZone` in `.env` only if needed.

| City | Timezone |
| --- | --- |
| Toronto | `America/Toronto` |
| New York | `America/New_York` |
| London | `Europe/London` |
| Paris | `Europe/Paris` |
| Berlin | `Europe/Berlin` |
| Tokyo | `Asia/Tokyo` |
| Seoul | `Asia/Seoul` |
| New Delhi | `Asia/Kolkata` |
| Sydney | `Australia/Sydney` |
| Auckland | `Pacific/Auckland` |

Use an IANA timezone name, not a fixed UTC offset. Existing installations retain their own `.env` value. Recreate the API container after changing the timezone.
