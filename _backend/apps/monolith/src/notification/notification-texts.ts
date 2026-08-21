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
}

interface NotificationText {
  title: string;
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
      title: 'Nová jízda',
      body: (payload) => rideBody(payload, 'km', 'Jízda byla přidána'),
    },
    en: {
      title: 'New ride',
      body: (payload) => rideBody(payload, 'km', 'Ride added'),
    },
  },
  strava_activity_unassigned: {
    cs: {
      title: 'Nová jízda čeká na kolo',
      body: (payload) => unassignedBody(payload, 'km', 'Vyber, ke kterému kolu jízda patří.'),
    },
    en: {
      title: 'New ride needs a bike',
      body: (payload) => unassignedBody(payload, 'km', 'Pick the bike this ride belongs to.'),
    },
  },
  maintenance_due: {
    cs: {
      title: 'Čas na servis',
      body: (payload) => (payload.bikeName ? `Kolo ${payload.bikeName} potřebuje servis.` : 'Kolo potřebuje servis.'),
    },
    en: {
      title: 'Service due',
      body: (payload) => (payload.bikeName ? `${payload.bikeName} needs a service.` : 'A bike needs a service.'),
    },
  },
  achievement_unlocked: {
    cs: {
      title: 'Nový úspěch',
      body: () => 'Odemkl jsi nový úspěch.',
    },
    en: {
      title: 'Achievement unlocked',
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
  return { title: text.title, body: text.body(payload) };
}
