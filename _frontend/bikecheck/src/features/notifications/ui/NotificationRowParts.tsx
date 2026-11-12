// What the phone and desktop notification rows share; they differ only in where the time and actions sit.
import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { PiPath } from "react-icons/pi";
import { RouteMap } from "@/components/RouteMap";
import { NOTIFICATION_ICONS, notificationIconColor } from "@/features/notifications/notificationIcon";
import type { Notification } from "@/features/notifications/notifications.types";
import type { PendingRide } from "@/features/strava/strava.types";

// Wider than the page inset: the unread dot hangs in this gutter, so the rows keep one edge.
export const NOTIFICATION_ROW_INSET = 20;
export const NOTIFICATION_ROW_GAP = 12;

const MARK_SIZE = 44;
const ROUTE_SIZE = 34;
const UNREAD_DOT_SIZE = 6;
// Same simplification as the pending list: a route drawn into a thumbnail.
const ROUTE_SIMPLIFY = 1;

export const NOTIFICATION_ROW_MIN_HEIGHT = MARK_SIZE + NOTIFICATION_ROW_GAP * 2;

// Needs a row that is `position: relative`.
export function NotificationUnreadDot(): ReactElement {
  return (
    <Box
      aria-hidden
      w={UNREAD_DOT_SIZE}
      h={UNREAD_DOT_SIZE}
      style={{
        position: "absolute",
        left: (NOTIFICATION_ROW_INSET - UNREAD_DOT_SIZE) / 2,
        top: (NOTIFICATION_ROW_MIN_HEIGHT - UNREAD_DOT_SIZE) / 2,
        borderRadius: "50%",
        backgroundColor: "var(--mantine-color-primary-6)",
      }}
    />
  );
}

// A ride's own route tells otherwise alike rows apart; anything else wears its type's icon.
export function NotificationMark({
  notification,
  pendingRide,
}: {
  notification: Notification;
  pendingRide: PendingRide | undefined;
}): ReactElement {
  const polyline = pendingRide?.summary_polyline ?? null;
  const Icon = isRide(notification) ? PiPath : NOTIFICATION_ICONS[notification.type];
  const color = notificationIconColor(notification, !notification.is_read);

  return (
    <Box
      aria-hidden
      w={MARK_SIZE}
      h={MARK_SIZE}
      mt={NOTIFICATION_ROW_GAP}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: NOTIFICATION_ROW_GAP,
        // A tint, not a card colour: the same tile sits on the phone's page and on the desktop's panel.
        backgroundColor: `color-mix(in srgb, ${polyline === null ? color : "var(--mantine-color-text-6)"} ${polyline === null ? 14 : 8}%, transparent)`,
      }}
    >
      {polyline !== null ? (
        <RouteMap polyline={polyline} width={ROUTE_SIZE} height={ROUTE_SIZE} strokeWidth={1.5} simplify={ROUTE_SIMPLIFY} />
      ) : (
        Icon !== undefined && <Icon size={20} color={color} />
      )}
    </Box>
  );
}

export function NotificationRowTitle({ notification }: { notification: Notification }): ReactElement {
  const unread = !notification.is_read;

  return (
    <Text
      fz={15}
      lh="20px"
      fw={unread ? 600 : 500}
      c={unread ? "text.6" : "var(--color-text-dim)"}
      lineClamp={1}
      style={{ flex: "1 1 auto", minWidth: 0 }}
    >
      {notification.title}
    </Text>
  );
}

// `pendingRide` is set while the ride still waits for a bike, which is the line's one accent.
export function NotificationRowDetail({
  notification,
  pendingRide,
}: {
  notification: Notification;
  pendingRide: PendingRide | undefined;
}): ReactElement {
  const { t } = useTranslation();
  const waiting = pendingRide !== undefined;

  return (
    <Text fz={13} lh="18px" c="var(--color-muted)" lineClamp={1}>
      {waiting && (
        <Text span inherit fw={500} c="primary.6">
          {t("notifications.waitingForBike")}
        </Text>
      )}
      {rowDetail(notification, waiting, t)}
    </Text>
  );
}

function isRide(notification: Notification): boolean {
  return notification.type === "strava_activity_unassigned" || notification.type === "strava_activity_saved";
}

// An unassigned ride keeps only its figures in the row; the headline is the shared "new ride".
function rowDetail(notification: Notification, waiting: boolean, t: TFunction): string {
  if (notification.type !== "strava_activity_unassigned") return notification.body;

  const { km, elevationM } = notification.payload ?? {};
  const figures: string[] = [];
  if (km !== undefined) figures.push(t("pendingRides.distance", { count: km }));
  if (elevationM) figures.push(t("pendingRides.elevation", { count: elevationM }));

  if (waiting) return figures.map((figure) => ` · ${figure}`).join("");
  return figures.length > 0 ? figures.join(" · ") : notification.body;
}
