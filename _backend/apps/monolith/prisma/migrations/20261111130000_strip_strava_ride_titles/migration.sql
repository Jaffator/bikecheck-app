-- An unassigned-ride notification no longer carries the Strava title (policy §6.2, #375).
-- The old body ended with it ("42 km · 600 m · Morning Ride"); the figures stay.
UPDATE "notifications"
SET "body" = COALESCE(
      NULLIF(regexp_replace("body", '(^|\s·\s)[^·]*$', ''), ''),
      "payload"->>'km' || ' km',
      ''
    ),
    "payload" = "payload" - 'activityName'
WHERE "type" = 'strava_activity_unassigned' AND "payload" ? 'activityName';
