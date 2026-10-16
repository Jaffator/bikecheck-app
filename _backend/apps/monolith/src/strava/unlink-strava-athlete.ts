import axios from 'axios';

// strava-service revokes the grant and drops the tokens and raw activities; the athlete id is all it needs.
// A function rather than a StravaEventsService method: account deletion calls it after the user row is gone.
export async function unlinkStravaAthlete(athleteId: number): Promise<void> {
  await axios.post(
    `${process.env.STRAVA_SERVICE_URL}/strava/disconnect`,
    { athleteId },
    // It waits on Strava's revoke (5 s) before its own deletes.
    { headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET }, timeout: 10_000 },
  );
}
