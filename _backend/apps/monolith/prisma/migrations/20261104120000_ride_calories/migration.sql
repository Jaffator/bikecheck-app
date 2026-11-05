-- Home reads the Period's energy from the rides (#336); the kcal were only in json_data until now.
ALTER TABLE "rides" ADD COLUMN "calories" INTEGER;

-- json_data holds Strava's activity as a JSON string inside jsonb, so it is decoded once more before read.
UPDATE "rides"
SET "calories" = ROUND(((json_data #>> '{}')::jsonb ->> 'calories')::numeric)::integer
WHERE json_data IS NOT NULL
  AND jsonb_typeof(json_data) IN ('string', 'object')
  AND ((json_data #>> '{}')::jsonb ->> 'calories') IS NOT NULL;
