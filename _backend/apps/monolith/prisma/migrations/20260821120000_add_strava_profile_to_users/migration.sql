-- Strava's OAuth response carries no email, so the athlete id was the only thing
-- identifying a linked account — a number that tells the user nothing. These
-- fields let the app name the account instead.
--
-- All nullable: Strava guarantees none of them. An athlete may have no surname
-- and no profile picture, and the values are a snapshot taken when the account
-- was linked, so they are refreshed only on a reconnect.
ALTER TABLE "users" ADD COLUMN "strava_firstname" VARCHAR;
ALTER TABLE "users" ADD COLUMN "strava_lastname" VARCHAR;
ALTER TABLE "users" ADD COLUMN "strava_username" VARCHAR;

-- Deliberately separate from users.avatar_url, which is the user's identity in
-- this app: linking Strava must not silently replace the face in the nav bar,
-- and unlinking would have nothing to restore it from.
ALTER TABLE "users" ADD COLUMN "strava_avatar_url" VARCHAR;
