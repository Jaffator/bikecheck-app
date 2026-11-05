// One phone notification: its mark, what it is about, when it came, and a dot while unread.
import type { ReactElement } from "react";
import { Box, Group, Text, UnstyledButton } from "@mantine/core";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { PiPath } from "react-icons/pi";
import { PANEL_HAIRLINE } from "@/components/panelRows";
import { RouteMap } from "@/components/RouteMap";
import { NOTIFICATION_ICONS, notificationIconColor } from "@/features/notifications/notificationIcon";
import { notificationShortTime, type NotificationDay } from "@/features/notifications/notificationTime";
import type { Notification } from "@/features/notifications/notifications.types";
import type { PendingRide } from "@/features/strava/strava.types";

// Wider than the page inset: the unread dot hangs in this gutter, so the rows keep one edge.
export const NOTIFICATION_ROW_INSET = 20;

const MARK_SIZE = 44;
const ROUTE_SIZE = 34;
const ROW_PADDING = 12;
const UNREAD_DOT_SIZE = 6;
// Same simplification as the pending list: a route drawn into a thumbnail.
const ROUTE_SIMPLIFY = 1;

interface NotificationListRowProps {
  notification: Notification;
  day: NotificationDay;
  // The first row of a day draws no hairline above it.
  first: boolean;
  // Set while the ride still waits for a bike. Read marks cannot say so: opening a row marks it read.
  pendingRide: PendingRide | undefined;
  onOpen: (notification: Notification) => void;
}

export function NotificationListRow({ notification, day, first, pendingRide, onOpen }: NotificationListRowProps): ReactElement {
  const { t } = useTranslation();
  const unread = !notification.is_read;

  return (
    <UnstyledButton
      onClick={() => onOpen(notification)}
      className="hover-veil active:opacity-70"
      style={{
        position: "relative",
        display: "flex",
        gap: ROW_PADDING,
        width: "100%",
        paddingLeft: NOTIFICATION_ROW_INSET,
        textAlign: "left",
        transition: "opacity 0.12s ease",
      }}
    >
      {unread && <UnreadDot />}
      <RowMark notification={notification} unread={unread} polyline={pendingRide?.summary_polyline ?? null} />

      <Box
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: MARK_SIZE + ROW_PADDING * 2,
          padding: `${ROW_PADDING}px ${NOTIFICATION_ROW_INSET}px ${ROW_PADDING}px 0`,
          borderTop: first ? undefined : PANEL_HAIRLINE,
        }}
      >
        <Group gap={ROW_PADDING} wrap="nowrap" align="baseline">
          <Text
            fz={15}
            lh="20px"
            fw={unread ? 600 : 500}
            c={unread ? "text.6" : "var(--color-text-dim)"}
            lineClamp={1}
            style={{ flex: 1, minWidth: 0 }}
          >
            {rowTitle(notification)}
          </Text>
          <Text className="tabular-nums" fz={12} lh="16px" c="var(--color-muted)" style={{ flexShrink: 0 }}>
            {notificationShortTime(notification.created_at, day)}
          </Text>
        </Group>

        <Text fz={13} lh="18px" mt={2} c="var(--color-muted)" lineClamp={1}>
          {pendingRide !== undefined && (
            <Text span inherit fw={500} c="primary.6">
              {t("notifications.waitingForBike")}
            </Text>
          )}
          {rowDetail(notification, pendingRide !== undefined, t)}
        </Text>
      </Box>
    </UnstyledButton>
  );
}

function UnreadDot(): ReactElement {
  return (
    <Box
      aria-hidden
      w={UNREAD_DOT_SIZE}
      h={UNREAD_DOT_SIZE}
      style={{
        position: "absolute",
        left: (NOTIFICATION_ROW_INSET - UNREAD_DOT_SIZE) / 2,
        top: ROW_PADDING + (MARK_SIZE - UNREAD_DOT_SIZE) / 2,
        borderRadius: "50%",
        backgroundColor: "var(--mantine-color-primary-6)",
      }}
    />
  );
}

// A ride's own route tells otherwise alike rows apart; anything else wears its type's icon.
function RowMark({
  notification,
  unread,
  polyline,
}: {
  notification: Notification;
  unread: boolean;
  polyline: string | null;
}): ReactElement {
  const Icon = isRide(notification) ? PiPath : NOTIFICATION_ICONS[notification.type];
  const color = notificationIconColor(notification, unread);

  return (
    <Box
      aria-hidden
      w={MARK_SIZE}
      h={MARK_SIZE}
      mt={ROW_PADDING}
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: ROW_PADDING,
        // The icon's own colour, faint, as on the desktop row; a route sits on a plain card.
        backgroundColor: polyline === null ? `color-mix(in srgb, ${color} 14%, transparent)` : "var(--mantine-color-cards-6)",
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

function isRide(notification: Notification): boolean {
  return notification.type === "strava_activity_unassigned" || notification.type === "strava_activity_saved";
}

// Every unassigned ride shares one headline, so the ride's own name takes its place.
function rowTitle(notification: Notification): string {
  if (notification.type !== "strava_activity_unassigned") return notification.title;
  return notification.payload?.activityName ?? notification.title;
}

// The stored body already carries the ride's name, which is the title here, so only its figures stay.
function rowDetail(notification: Notification, waiting: boolean, t: TFunction): string {
  if (notification.type !== "strava_activity_unassigned") return notification.body;

  const { km, elevationM } = notification.payload ?? {};
  const figures: string[] = [];
  if (km !== undefined) figures.push(t("pendingRides.distance", { count: km }));
  if (elevationM) figures.push(t("pendingRides.elevation", { count: elevationM }));

  if (waiting) return figures.map((figure) => ` · ${figure}`).join("");
  return figures.length > 0 ? figures.join(" · ") : notification.body;
}
