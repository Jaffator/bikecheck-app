import { NotificationType } from './notification-types.config';

// The languages the app ships translations for. Anything else — including a
// user who never picked one — falls back to English.
export type NotificationLanguage = 'cs' | 'en';

const FALLBACK_LANGUAGE: NotificationLanguage = 'en';

export function resolveLanguage(language: string | null): NotificationLanguage {
  return language === 'cs' || language === 'en' ? language : FALLBACK_LANGUAGE;
}

// What a notification's text is built from. Every field is optional because a
// payload only carries what its own type needs, and a notification created
// before a field existed must still render.
export interface NotificationTextPayload {
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
  strava_no_gear: {
    cs: {
      title: 'Jízda bez kola',
      body: () => 'Nová jízda ze Stravy nemá přiřazené kolo. Vyber, ke kterému patří.',
    },
    en: {
      title: 'Ride without a bike',
      body: () => 'A new Strava ride has no bike assigned. Pick the one it belongs to.',
    },
  },
  strava_unmatched_gear: {
    cs: {
      title: 'Neznámé kolo ze Stravy',
      body: (payload) =>
        payload.gearName
          ? `Kolo "${payload.gearName}" ze Stravy zatím nemáš spárované s kolem v BikeCheck.`
          : 'Kolo ze Stravy zatím nemáš spárované s kolem v BikeCheck.',
    },
    en: {
      title: 'Unknown Strava bike',
      body: (payload) =>
        payload.gearName
          ? `Your Strava bike "${payload.gearName}" is not linked to a BikeCheck bike yet.`
          : 'A Strava bike is not linked to a BikeCheck bike yet.',
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

// Builds the stored title and body for a notification in the user's language.
export function buildNotificationText(
  type: NotificationType,
  language: string | null,
  payload: NotificationTextPayload = {},
): { title: string; body: string } {
  const text = TEXTS[type][resolveLanguage(language)];
  return { title: text.title, body: text.body(payload) };
}
