// The morning reminder of a planned day (ADR 0038, revised): a delayed job, so nothing polls.
export const PLAN_REMINDER_QUEUE = 'plan-reminder-queue';
export const PLAN_REMINDER_JOB = 'remind-plans';

// The zone a client that sent none is assumed to be in.
export const DEFAULT_TIME_ZONE = 'Europe/Prague';

const REMINDER_HOUR = 8;

export interface PlanReminderJob {
  userId: number;
  // YYYY-MM-DD, as `planned_for` is served.
  day: string;
}

// One job per owner per day; a second plan on the same day adds nothing.
export function planReminderJobId(userId: number, day: string): string {
  return `plan-${userId}-${day}`;
}

// 08:00 on the day in the zone, as an instant. The offset is read twice so a clock change that night lands right.
export function reminderAt(day: string, timeZone: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const wall = Date.UTC(year, month - 1, date, REMINDER_HOUR);
  const guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  return new Date(wall - zoneOffsetMs(new Date(guess), timeZone));
}

// How far the zone's wall clock is ahead of UTC at that instant.
function zoneOffsetMs(moment: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(moment);
  const part = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((candidate) => candidate.type === type)?.value);

  const asUtc = Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
  return asUtc - Math.floor(moment.getTime() / 1000) * 1000;
}
