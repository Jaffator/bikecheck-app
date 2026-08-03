// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Box, Button, Group, Image, Stack, Text } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lightbulb, Plus } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import bikeIllustration from "@/assets/images/empty_garage_bike.png";

// What a user with no bikes yet sees on the Garage tab. The header and the tab
// bar around it belong to AppLayout — this is only the AppShell.Main content.
export function EmptyGarage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box pos="relative" px={16} pb={64}>
      {/* ----------- Illustration layer ----------- */}
      {/* Sits behind the copy on purpose: the gradient fades the lower half of
          the bike into the background so the heading can sit on top of it. */}
      <Box pos="absolute" top={0} left={0} right={0} className="pointer-events-none">
        <Image
          src={bikeIllustration}
          alt=""
          w="100%"
          opacity={0.38}
          style={{ boxShadow: "0 0 100px 0 rgba(183, 201, 211, 0.2)" }}
        />
        <Box
          pos="absolute"
          bottom={0}
          left={0}
          right={0}
          h="42%"
          style={{ background: "linear-gradient(180deg, rgba(21, 19, 10, 0) 0%, rgba(21, 19, 10, 1) 85%)" }}
        />
      </Box>

      <Box pos="absolute" top={16} right={16}>
        <StatusBadge label={t("bikes.noBikesFound")} />
      </Box>

      {/* ----------- Copy + actions ----------- */}
      {/* pt drops the text onto the faded-out part of the bike above it. */}
      <Stack pos="relative" pt="72%" gap={16}>
        <Stack gap={16} ta="center">
          <Text fz={24} lh="32px" fw={600} c="var(--color-text-bright)">
            {t("bikes.emptyTitle")}
          </Text>
          <Text fz={16} lh="26px" c="var(--color-text-dim)">
            {t("bikes.emptyBody")}
          </Text>
        </Stack>

        {/* TODO: /bikes/new does not exist yet — the add-bike flow is its own feature. */}
        {/* mt on top of the Stack gap gives the 32px the design puts here. */}
        <Button
          mt={16}
          h={48}
          radius={8}
          fz={18}
          fw={600}
          color="primary.6"
          c="textDark.6"
          leftSection={<Plus size={14} />}
          style={{ boxShadow: "0 0 10px 0 rgba(255, 255, 0, 0.25), 0 4px 4px 0 rgba(0, 0, 0, 0.25)" }}
          onClick={() => navigate("/bikes/new")}
        >
          {t("bikes.addFirstBike")}
        </Button>

        <Group
          gap={16}
          align="flex-start"
          wrap="nowrap"
          p={16}
          bg="cards.6"
          className="rounded-xl"
          style={{ border: "1px solid var(--color-border-subtle)" }}
        >
          <Lightbulb size={20} color="var(--color-accent)" className="mt-0.5 shrink-0" />
          <Stack gap={4}>
            <Text className="font-mono" fz={12} lh="16px" fw={500} lts="0.05em" c="var(--color-accent)">
              {t("common.proTip")}
            </Text>
            <Text fz={14} lh="20px" c="var(--color-text-dim)">
              {t("bikes.proTipBody")}
            </Text>
          </Stack>
        </Group>
      </Stack>
    </Box>
  );
}
