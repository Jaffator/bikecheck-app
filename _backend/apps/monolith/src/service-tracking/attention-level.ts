// The 80 / 95 / 100 numbers, in the one place that owns them. The colour bands, the
// dashboard's cutoff and the announcements all read them here, so a row cannot change
// colour for one reason and notify for another (ADR 0026).

// Which measure a Service Interval is expressed in. The bike's interval row fills in
// whichever applies; the part's matching accumulator is read against it.
export type WearAxis = 'km' | 'min' | 'health_index';

// How much attention one Tracked Action is asking for.
export type AttentionLevel = 'good' | 'warning' | 'critical' | 'overdue';

// The percentage at which each band begins. Read as whole percent, which is also how a
// percentage is reported - so the number on screen and the colour behind it always agree.
export const ATTENTION_THRESHOLDS: Record<Exclude<AttentionLevel, 'good'>, number> = {
  warning: 80,
  critical: 95,
  overdue: 100,
};

// good below 80, warning 80-94, critical 95-99, overdue at 100 and above. Never capped:
// a chain left on for another season reads 132% and is overdue, not 100%.
export function attentionLevel(percentage: number): AttentionLevel {
  if (percentage >= ATTENTION_THRESHOLDS.overdue) return 'overdue';
  if (percentage >= ATTENTION_THRESHOLDS.critical) return 'critical';
  if (percentage >= ATTENTION_THRESHOLDS.warning) return 'warning';
  return 'good';
}
