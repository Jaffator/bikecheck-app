import axios from 'axios';

// strava-service revokes the grant and drops the tokens and raw activities; the athlete id is all it needs (#272).
export async function forgetStravaAthlete(athleteId: number): Promise<void> {
  await axios.post(
    `${process.env.STRAVA_SERVICE_URL}/strava/forget`,
    { athleteId },
    // Longer than disconnect's: it waits on Strava's revoke (5 s) before its own deletes.
    { headers: { 'x-internal-secret': process.env.INTERNAL_API_SECRET }, timeout: 10_000 },
  );
}
