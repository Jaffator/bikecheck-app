curl -X POST \
 https://www.strava.com/api/v3/push_subscriptions \
 -F client_id=235898 \
 -F client_secret=3c70e23b491afd63f6a5add7a724858ace130b90 \
 -F callback_url=https://syrup-latch-certainty.ngrok-free.dev/strava/webhook \
 -F verify_token=STRAVA
