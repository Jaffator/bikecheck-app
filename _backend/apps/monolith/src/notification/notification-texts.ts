import { NotificationType } from './notification-types.config';
import { CATALOGUE_NAMES } from './catalogue-names.generated';

// The languages the app ships translations for. Anything else — including a
// user who never picked one — falls back to English.
export type NotificationLanguage = 'cs' | 'en';

const FALLBACK_LANGUAGE: NotificationLanguage = 'en';

export function resolveLanguage(language: string | null): NotificationLanguage {
  return language === 'cs' || language === 'en' ? language : FALLBACK_LANGUAGE;
}

// What a notification carries besides its type: the facts its text is built
// from, and the ids its route is filled in from. Every field is optional
// because a payload only holds what its own type needs, and a notification
// created before a field existed must still render.
//
// The id fields are what NOTIFICATION_CONFIG's route placeholders are named
// after — ':bikeId' is filled from bikeId — so a placeholder with no field
// here can never be filled, and the route is dropped rather than sent broken.
export interface NotificationTextPayload {
  // Route placeholders.
  bikeId?: number;
  activityId?: string;
  gearId?: string;
  // Text values.
  bikeName?: string;
  km?: number;
  // Metres climbed. Named for what it is rather than for the column it came from, like
  // every other field here.
  elevationM?: number;
  gearName?: string;
  activityName?: string;
  // How many Tracked Actions on the bike are coming up, due, and past due. Where the bike
  // stands, not only what just moved - the line has to size the job, and an action
  // announced last week is still an action waiting.
  soonCount?: number;
  dueCount?: number;
  overdueCount?: number;
  // The worst band the bike stands in, which is what the headline and the icon read.
  level?: 'warning' | 'critical' | 'overdue';
  // The Tracked Actions that crossed a band in this evaluation - the news itself, named.
  crossed?: CrossedAction[];
  // The other party of a follow, as the app names people. Absent when they have none.
  handle?: string;
  personName?: string;
}

// One Tracked Action that just crossed: the part and the job, each as a catalogue key with
// the raw name behind it for a type the owner named themselves, and how far along it is.
export interface CrossedAction {
  componentKey: string | null;
  componentName: string;
  actionKey: string | null;
  actionName: string;
  percentage: number;
}

// Both halves are written from the payload, because a maintenance reminder's headline
// turns on whether anything is past due and not only on how much.
interface NotificationText {
  title: (payload: NotificationTextPayload) => string;
  body: (payload: NotificationTextPayload) => string;
}

type NotificationTexts = Record<NotificationLanguage, NotificationText>;

// Push notifications are rendered by the OS while the app is not running, so
// their text cannot be translated on the client the way the in-app list would
// be — it has to be written in the user's language here, at creation time.
// A notification therefore keeps the language it was created in; switching
// language later changes new notifications only.
const TEXTS: Record<NotificationType, NotificationTexts> = {
  strava_activity_saved: {
    cs: {
      title: () => 'Nová jízda',
      body: (payload) => rideBody(payload, 'km', 'Jízda byla přidána'),
    },
    en: {
      title: () => 'New ride',
      body: (payload) => rideBody(payload, 'km', 'Ride added'),
    },
  },
  strava_activity_unassigned: {
    cs: {
      title: () => 'Nová jízda čeká na kolo',
      body: (payload) => unassignedBody(payload, 'km', 'Vyber, ke kterému kolu jízda patří.'),
    },
    en: {
      title: () => 'New ride needs a bike',
      body: (payload) => unassignedBody(payload, 'km', 'Pick the bike this ride belongs to.'),
    },
  },
  maintenance_due: {
    cs: {
      // 70 says a job is on the horizon; 95 asks the owner to order the part; 100 tells
      // them they are riding on borrowed time. One notification can carry all three, and
      // the worst of them names it.
      title: (payload) => MAINTENANCE_TITLES.cs[payload.level ?? 'critical'],
      body: (payload) =>
        maintenanceBody(payload, 'cs', {
          soon: 'brzy',
          due: 'k servisu',
          overdue: 'po termínu',
          named: (bike) => `Kolo ${bike} potřebuje servis.`,
          fallback: 'Kolo potřebuje servis.',
        }),
    },
    en: {
      title: (payload) => MAINTENANCE_TITLES.en[payload.level ?? 'critical'],
      body: (payload) =>
        maintenanceBody(payload, 'en', {
          soon: 'soon',
          due: 'due',
          overdue: 'overdue',
          named: (bike) => `${bike} needs a service.`,
          fallback: 'A bike needs a service.',
        }),
    },
  },
  achievement_unlocked: {
    cs: {
      title: () => 'Nový úspěch',
      body: () => 'Odemkl jsi nový úspěch.',
    },
    en: {
      title: () => 'Achievement unlocked',
      body: () => 'You unlocked a new achievement.',
    },
  },
  new_follower: {
    cs: {
      title: () => 'Nový sledující',
      body: (payload) => `${personLabel(payload, 'Někdo')} teď sleduje tvoji garáž.`,
    },
    en: {
      title: () => 'New follower',
      body: (payload) => `${personLabel(payload, 'Someone')} now follows your garage.`,
    },
  },
};

// "Jarda Novák (@jaffa)", or whichever half is known: a follower without a profile has no
// handle, an account without a name reads as its handle alone.
function personLabel(payload: NotificationTextPayload, anonymous: string): string {
  const handle = payload.handle ? `@${payload.handle}` : null;
  if (payload.personName) return handle ? `${payload.personName} (${handle})` : payload.personName;
  return handle ?? anonymous;
}

// "42 km · 620 m ↑ · Canyon Grail" — whichever parts the payload actually carries, so a
// ride saved without a distance still reads as a sentence rather than a stray
// separator.
function rideBody(payload: NotificationTextPayload, unit: string, fallback: string): string {
  const parts: string[] = [];
  if (payload.km !== undefined) parts.push(`${payload.km} ${unit}`);
  const climb = climbed(payload);
  if (climb !== null) parts.push(climb);
  if (payload.bikeName) parts.push(payload.bikeName);
  return parts.length > 0 ? parts.join(' · ') : fallback;
}

// "620 m ↑", or nothing at all: a flat ride and a ride whose climb was never recorded
// both read better without the figure than with a zero.
function climbed(payload: NotificationTextPayload): string | null {
  if (!payload.elevationM) return null;
  return `${payload.elevationM} m ↑`;
}

// "Canyon Grail · 2 due, 1 overdue": the bike, then the size of the job, so one line says
// whether this is an errand or an afternoon. A notification written before the counts
// existed carries none, and still has to read as a sentence.
function maintenanceBody(
  payload: NotificationTextPayload,
  language: NotificationLanguage,
  words: { soon: string; due: string; overdue: string; named: (bike: string) => string; fallback: string },
): string {
  // A heads-up names what is coming and how far along it is; nothing is due yet, so
  // there is no job to size, only jobs to expect.
  if (payload.level === 'warning' && payload.crossed && payload.crossed.length > 0) {
    const jobs = payload.crossed.map((action) => crossedLabel(action, language)).join(', ');
    return payload.bikeName ? `${payload.bikeName} · ${jobs}` : jobs;
  }

  const counts: string[] = [];
  if (payload.soonCount) counts.push(`${payload.soonCount} ${words.soon}`);
  if (payload.dueCount) counts.push(`${payload.dueCount} ${words.due}`);
  if (payload.overdueCount) counts.push(`${payload.overdueCount} ${words.overdue}`);

  if (counts.length === 0) return payload.bikeName ? words.named(payload.bikeName) : words.fallback;
  return payload.bikeName ? `${payload.bikeName} · ${counts.join(', ')}` : counts.join(', ');
}

// The ride's own name identifies it better than anything else, so it takes the
// place the ask used to hold. The distance still leads. A ride that arrived
// without a name falls back to the ask, which is why the notification was sent.
function unassignedBody(payload: NotificationTextPayload, unit: string, ask: string): string {
  const parts: string[] = [];
  if (payload.km !== undefined) parts.push(`${payload.km} ${unit}`);
  const climb = climbed(payload);
  if (climb !== null) parts.push(climb);
  parts.push(payload.activityName ?? ask);
  return parts.join(' · ');
}

// One crossed Tracked Action, written the way the app's cards write it: the part, the job,
// the percentage. A catalogue key is translated; a name the owner typed is shown as typed.
function crossedLabel(action: CrossedAction, language: NotificationLanguage): string {
  const part = catalogueName(action.componentKey, action.componentName, language);
  const job = catalogueName(action.actionKey, action.actionName, language);
  return `${part} – ${job} ${action.percentage} %`;
}

// What the app calls a catalogue entry in this language, from the copy of its locale files
// the server keeps (catalogue-names.generated.ts). Falls back to the raw name.
function catalogueName(key: string | null, fallback: string, language: NotificationLanguage): string {
  if (key === null) return fallback;
  const names: Record<string, string> = CATALOGUE_NAMES[language];
  return names[key] ?? fallback;
}

// The headline per band. A notification sent while nothing is yet due reads as a heads-up,
// not a demand; one with anything past due reads as the demand it is.
const MAINTENANCE_TITLES: Record<'cs' | 'en', Record<NonNullable<NotificationTextPayload['level']>, string>> = {
  cs: { warning: 'Blíží se servis', critical: 'Čas na servis', overdue: 'Servis po termínu' },
  en: { warning: 'Service coming up', critical: 'Service due', overdue: 'Service overdue' },
};

// Builds the stored title and body for a notification in the user's language.
export function buildNotificationText(
  type: NotificationType,
  language: string | null,
  payload: NotificationTextPayload = {},
): { title: string; body: string } {
  const text = TEXTS[type][resolveLanguage(language)];
  return { title: text.title(payload), body: text.body(payload) };
}
