// The sheet the More tab opens: the two places that have no tab of their own - the riders
// the user is tied to, and the chat. Cards, not a menu, so each says what is waiting inside.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ActionIcon, Box, Drawer, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MessageCircleMore, Users, X } from "lucide-react";
import { SheetGrabber } from "@/components/SheetGrabber";
import { useMyProfile } from "@/features/profile/profile.queries";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { BADGE_CAP } from "./HeaderCountBadge";
import { CONTENT_MAX_WIDTH } from "./contentWidth";

// Over the tab bar the sheet is opened from, as the settings drawers sit over their page.
const DRAWER_Z_INDEX = 320;

// A list row's surface, the same one the dashboard tiles stand on.
const CARD: CSSProperties = {
  display: "block",
  width: "100%",
  borderRadius: "var(--mantine-radius-lg)",
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  boxShadow: "var(--elev-row)",
  transition: "transform 0.12s ease",
};

interface CardProps {
  icon: ReactNode;
  title: string;
  // The figures or the pitch under the title, in the data voice.
  detail: string;
  // What waits inside: a count, or a word such as AI.
  tag: ReactNode;
  onOpen: () => void;
}

function MoreCard({ icon, title, detail, tag, onOpen }: CardProps): ReactElement {
  return (
    <UnstyledButton onClick={onOpen} className="active:scale-[0.985]" style={CARD}>
      <Stack gap={10} px="sm" py="sm" h="100%" style={{ minWidth: 0 }}>
        {/* Half a row wide, the tag has no row end to sit at, so it shares the icon's line. */}
        <Group gap="xs" wrap="nowrap" justify="space-between" style={{ minWidth: 0 }}>
          <Box
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2.25rem",
              height: "2.25rem",
              borderRadius: "0.625rem",
              flexShrink: 0,
              backgroundColor: "var(--mantine-color-cards-5)",
            }}
          >
            {icon}
          </Box>
          {tag}
        </Group>
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fz={15} fw={600} c="text.6" lineClamp={1}>
            {title}
          </Text>
          {/* Two lines: "12 sledujících · 2 žádosti" does not fit one at this width. */}
          <Text className="font-mono" fz={11} tt="uppercase" lts="0.06em" c="var(--color-text-dim)" lineClamp={2}>
            {detail}
          </Text>
        </Stack>
      </Stack>
    </UnstyledButton>
  );
}

// The count of waiting requests, in the bell badge's voice.
function CountPill({ count }: { count: number }): ReactElement {
  return (
    <Box
      miw={20}
      h={20}
      px={6}
      style={{
        borderRadius: "9999px",
        backgroundColor: "var(--mantine-color-primary-6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Text className="font-mono" fz={11} fw={700} c="var(--mantine-color-cards-8)" lh={1}>
        {count > BADGE_CAP ? `${BADGE_CAP}+` : count}
      </Text>
    </Box>
  );
}

interface MoreDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function MoreDrawer({ opened, onClose }: MoreDrawerProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: profile } = useMyProfile();
  // Nothing here is remounted per opening, so the sheet takes `opened` straight through and
  // still slides (docs/conventions/drawers.md).
  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  const followers = profile?.stats.followers ?? 0;
  const requests = profile?.stats.pending_requests ?? 0;
  // Requests are named only while some wait; the figure alone would read as a zero score.
  // Own keys, because a counted noun is not the column heading Czech declines differently.
  const ridersDetail =
    requests > 0
      ? `${followers} ${t("more.ridersFollowers")} · ${requests} ${t("more.ridersRequests")}`
      : `${followers} ${t("more.ridersFollowers")}`;

  // The sheet closes as it navigates, so back from the page lands where it was opened.
  function open(path: string): void {
    onClose();
    navigate(path);
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={DRAWER_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto" },
        body: {
          paddingInline: 8,
          paddingTop: 8,
          paddingBottom: "calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
        },
      }}
    >
      {/* In the browser the sheet is the page's own column rather than the whole window. */}
      <Stack gap="sm" maw={CONTENT_MAX_WIDTH} mx="auto">
        <SheetGrabber onClose={onClose} />
        {/* Header: the sheet's name on the left, the way out on the right. */}
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text fw={700} fz={18} c="text.6" lh={1.2}>
            {t("nav.more")}
          </Text>
          <ActionIcon
            variant="subtle"
            color="gray"
            radius="xl"
            size="lg"
            aria-label={t("action.close")}
            onClick={onClose}
          >
            <X size={20} color="var(--mantine-color-text-6)" />
          </ActionIcon>
        </Group>
        {/* Side by side and equal: two tiles, neither the headline of the other. */}
        <Group grow align="stretch" gap="sm" wrap="nowrap">
          <MoreCard
            icon={<Users size={19} color="var(--mantine-color-text-6)" />}
            title={t("page.follows")}
            detail={ridersDetail}
            tag={requests > 0 ? <CountPill count={requests} /> : null}
            onOpen={() => open("/follows")}
          />
          <MoreCard
            icon={<MessageCircleMore size={19} color="var(--mantine-color-text-6)" />}
            title={t("page.chat")}
            detail={t("more.chatDetail")}
            tag={
              <Text className="font-mono" fz={10} fw={700} tt="uppercase" lts="0.08em" c="primary.6" style={{ flexShrink: 0 }}>
                {t("more.chatTag")}
              </Text>
            }
            onOpen={() => open("/chat")}
          />
        </Group>
      </Stack>
    </Drawer>
  );
}
