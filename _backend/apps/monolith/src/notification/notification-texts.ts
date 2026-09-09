import { NotificationType } from './notification-types.config';

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
  gearName?: string;
  activityName?: string;
  // How many Tracked Actions on the bike are due, and how many are past due. Where the
  // bike stands, not only what just moved - the line has to size the job, and an action
  // announced last week is still an action waiting.
  dueCount?: number;
  overdueCount?: number;
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
      // 95 asks the owner to order the part; 100 tells them they are riding on borrowed
      // time. One notification can carry both, and the worse of the two names it.
      title: (payload) => (payload.overdueCount ? 'Servis po termínu' : 'Čas na servis'),
      body: (payload) =>
        maintenanceBody(payload, {
          due: 'k servisu',
          overdue: 'po termínu',
          named: (bike) => `Kolo ${bike} potřebuje servis.`,
          fallback: 'Kolo potřebuje servis.',
        }),
    },
    en: {
      title: (payload) => (payload.overdueCount ? 'Service overdue' : 'Service due'),
      body: (payload) =>
        maintenanceBody(payload, {
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
};

// "42 km · Canyon Grail" — whichever halves the payload actually carries, so a
// ride saved without a distance still reads as a sentence rather than a stray
// separator.
function rideBody(payload: NotificationTextPayload, unit: string, fallback: string): string {
  const parts: string[] = [];
  if (payload.km !== undefined) parts.push(`${payload.km} ${unit}`);
  if (payload.bikeName) parts.push(payload.bikeName);
  return parts.length > 0 ? parts.join(' · ') : fallback;
}

// "Canyon Grail · 2 due, 1 overdue": the bike, then the size of the job, so one line says
// whether this is an errand or an afternoon. A notification written before the counts
// existed carries none, and still has to read as a sentence.
function maintenanceBody(
  payload: NotificationTextPayload,
  words: { due: string; overdue: string; named: (bike: string) => string; fallback: string },
): string {
  const counts: string[] = [];
  if (payload.dueCount) counts.push(`${payload.dueCount} ${words.due}`);
  if (payload.overdueCount) counts.push(`${payload.overdueCount} ${words.overdue}`);

  if (counts.length === 0) return payload.bikeName ? words.named(payload.bikeName) : words.fallback;
  return payload.bikeName ? `${payload.bikeName} · ${counts.join(', ')}` : counts.join(', ');
}

// The ride's own name identifies it better than anything else, so it takes the
// place the ask used to hold. The distance still leads. A ride that arrived
// without a name falls back to the ask, which is why the notification was sent.
function unassignedBody(payload: NotificationTextPayload, unit: string, ask: string): string {
  const tail = payload.activityName ?? ask;
  return payload.km === undefined ? tail : `${payload.km} ${unit} · ${tail}`;
}

// Builds the stored title and body for a notification in the user's language.
export function buildNotificationText(
  type: NotificationType,
  language: string | null,
  payload: NotificationTextPayload = {},
): { title: string; body: string } {
  const text = TEXTS[type][resolveLanguage(language)];
  return { title: text.title(payload), body: text.body(payload) };
}
