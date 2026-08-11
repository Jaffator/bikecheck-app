// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Box, Button, Group, Image, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { Lightbulb, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useCurrentUser } from "@/features/users/users.queries";
import graphPlaceholder from "@/assets/images/empty_dashboard_graph.png";

// What a user with no bikes yet sees on the Home tab. The header and the tab
// bar around it belong to AppLayout — this is only the AppShell.Main content.
export function EmptyDashboard(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Already cached by the auth gate in App.tsx, so this is a read, not a fetch.
  const { data: user } = useCurrentUser();

  // The greeting is a first-name address — a full name would read as a form field.
  const firstName = user?.name.split(" ")[0] ?? "";

  // AppShell.Main already reserves the tab bar's 64px, so pb adds the rest of
  // the 129px the design leaves below the last card.
  return (
    <Stack gap={24} px={16} pt={17} pb={64}>
      {/* ----------- Greeting ----------- */}
      <Stack gap={4}>
        <Text fz={24} lh="32px" fw={600} c="var(--color-text-bright)">
          {t("dashboard.greeting", { name: firstName })}
        </Text>
        <Text fz={16} lh="24px" c="var(--color-text-dim)">
          {t("dashboard.getStarted")}
        </Text>
      </Stack>

      {/* ----------- Empty chart ----------- */}
      {/* Decorative stand-in for the stats the user has not generated yet, so
          it is faded out and carries the "no data" badge instead of alt text. */}
      <Box pos="relative" w="100%" style={{ aspectRatio: "1 / 1" }}>
        <Image src={graphPlaceholder} alt="" radius={20} h="100%" w="100%" fit="cover" opacity={0.22} />
        <Box pos="absolute" top={21} left={17}>
          <StatusBadge label={t("dashboard.noActiveData")} />
        </Box>
      </Box>

      {/* ----------- Primary action ----------- */}
      {/* TODO: /bikes/new does not exist yet — the add-bike flow is its own feature. */}
      <Button
        h={56}
        radius={12}
        fz={16}
        fw={600}
        color="primary.6"
        c="textDark.6"
        leftSection={<Plus size={14} />}
        style={{ boxShadow: "0 0 10px 0 rgba(255, 255, 0, 0.25)" }}
        onClick={() => navigate("/bikes/new")}
      >
        {t("dashboard.addBike")}
      </Button>

      {/* ----------- Pro tip ----------- */}
      <Box
        pos="relative"
        p={16}
        bg="var(--color-surface)"
        className="overflow-hidden rounded-xl"
        style={{ border: "1px solid var(--color-border-strong)" }}
      >
        {/* Purely decorative watermark, anchored to the right edge so it stays
            half-clipped at any width. The copy below is positioned too and
            comes later in the DOM, which keeps it painted on top. */}
        <Lightbulb
          size={71}
          color="var(--color-decor)"
          className="pointer-events-none absolute opacity-20"
          style={{ top: 96, right: -22 }}
        />
        <Group pos="relative" gap={12} align="flex-start" wrap="nowrap">
          <Lightbulb size={20} color="var(--color-accent)" className="shrink-0" />
          <Stack gap={3}>
            <Text className="font-mono" fz={12} lh="16px" fw={500} lts="0.05em" c="var(--color-accent)">
              {t("common.proTip")}
            </Text>
            <Text fz={14} lh="22.75px" c="var(--color-text-dim)">
              {/* Only the brand name is highlighted, so the sentence stays one
                  translatable string instead of three concatenated fragments. */}
              <Trans
                i18nKey="dashboard.proTipBody"
                components={{ 1: <span style={{ color: "var(--color-text-bright)" }} /> }}
              />
            </Text>
          </Stack>
        </Group>
      </Box>
    </Stack>
  );
}
