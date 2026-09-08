// The three numbers Service Tracking is measured by, in one place. The bands a Tracked
// Action wears, the cutoff the dashboard reads at and the points an announcement goes out
// are the same three (ADR 0026), so a colour change and a notification can never end up
// with different causes.
export const ATTENTION_THRESHOLDS = {
  warning: 80,
  critical: 95,
  overdue: 100,
} as const;

export type AttentionLevel = 'good' | 'warning' | 'critical' | 'overdue';

// Which band a percentage falls in. Open-ended at the top: 132% is overdue, not capped.
export function attentionLevel(percentage: number): AttentionLevel {
  if (percentage >= ATTENTION_THRESHOLDS.overdue) return 'overdue';
  if (percentage >= ATTENTION_THRESHOLDS.critical) return 'critical';
  if (percentage >= ATTENTION_THRESHOLDS.warning) return 'warning';
  return 'good';
}
