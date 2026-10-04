curl -X POST \
 https://www.strava.com/api/v3/push_subscriptions \
 -F client_id=235898 \
 -F client_secret=$STRAVA_CLIENT_SECRET \
 -F callback_url=https://syrup-latch-certainty.ngrok-free.dev/strava/webhook \
 -F verify_token=STRAVA
