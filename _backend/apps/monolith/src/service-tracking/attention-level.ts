// The 60 / 75 / 90 / 100 numbers, in the one place that owns them. The colour ramp, the
// dashboard's cutoff and the announcements all read them here (ADR 0026, thresholds
// revised 2026-09-22). Above 100 the announcements keep going on their own step, which is
// the one place the two part company - see `reachedBand`.

// Which measure a Service Interval is expressed in. The bike's interval row fills in
// whichever applies; the part's matching accumulator is read against it.
export type WearAxis = 'km' | 'min' | 'health_index';

// Which accumulator a reading was actually taken from. Not the same question as the axis:
// a chain and a tyre are both measured in kilometres, but only the chain's are the ones the
// drivetrain worked for. The three derived ones are what the ride analysis made of the
// terrain, and the only ones an owner cannot be expected to guess at.
export type WearMeasure = 'total_km' | 'drivetrain_km' | 'total_time_min' | 'suspension_min' | 'health_index';

// How much attention one Tracked Action is asking for. Five steps, because the colour ramp
// always had five and the word under it used to have four - a part could be tinted and
// called good at the same time.
export type AttentionLevel = 'very_good' | 'good' | 'warning' | 'critical' | 'overdue';

// The percentage at which each level begins. Read as whole percent, which is also how a
// percentage is reported - so the number on screen and the colour behind it always agree.
export const ATTENTION_THRESHOLDS: Record<Exclude<AttentionLevel, 'very_good'>, number> = {
  good: 60,
  warning: 75,
  critical: 90,
  overdue: 100,
};

// very_good below 60, good 60-74, warning 75-89, critical 90-99, overdue at 100 and above.
// Never capped: a chain left on for another season reads 132% and is overdue, not 100%.
export function attentionLevel(percentage: number): AttentionLevel {
  if (percentage >= ATTENTION_THRESHOLDS.overdue) return 'overdue';
  if (percentage >= ATTENTION_THRESHOLDS.critical) return 'critical';
  if (percentage >= ATTENTION_THRESHOLDS.warning) return 'warning';
  if (percentage >= ATTENTION_THRESHOLDS.good) return 'good';
  return 'very_good';
}

// How far apart the bands run once a reading is past due. The interval is behind and the
// part is still on the bike, so the app keeps saying so - every tenth of the interval, the
// same slice putting the job off used to add.
const OVERDUE_BAND_STEP = 10;

// The band a reading has reached, as `reached_threshold` stores it: 0, 75, 90, then 100
// and every ten percent above it - 110, 120, 240. Uncapped, because the only honest end to
// being overdue is doing the job, raising the interval or muting the pairing.
//
// A band is an announcement waiting to happen, so the two levels that never announce share
// band 0: a part at 62% is good rather than very good, and that is worth a colour but not
// an interruption.
//
// Past 100 the band no longer follows the Attention Level either: 110 and 240 are both
// overdue and wear the same colour, but they are different bands and announce separately.
// That is deliberate - the colour ran out of room at overdue, and the reading did not.
export function reachedBand(percentage: number): number {
  if (percentage >= ATTENTION_THRESHOLDS.overdue) {
    return Math.floor(percentage / OVERDUE_BAND_STEP) * OVERDUE_BAND_STEP;
  }

  const level = attentionLevel(percentage);
  return announcingLevel(level) ? ATTENTION_THRESHOLDS[level] : 0;
}

// Whether a level is one the app speaks at all. Below warning it does not.
function announcingLevel(level: AttentionLevel): level is 'warning' | 'critical' | 'overdue' {
  return level === 'warning' || level === 'critical' || level === 'overdue';
}

// Which bands are worth interrupting for: every one there is. 75 is the heads-up that a job
// is on the horizon, 90 asks for the part to be ordered, 100 says the interval is behind -
// and each band above it says by how much.
export function announces(band: number): boolean {
  return band >= ATTENTION_THRESHOLDS.warning;
}
