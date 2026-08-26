// UI component using feature hooks.
import type { ReactElement } from "react";
import { Box, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { SERVICE_CARD_SURFACE } from "./serviceCardSurface";
import { catalogueLabel } from "./serviceLabels";
import { formatServiceDate, formatServiceDateShort } from "./serviceDates";
import type { ServiceHistoryItem } from "./service.types";

// As many Actions as a card names before it starts to read as a list of its own. What is
// left over is counted, and the detail has them all.
const VISIBLE_ACTIONS = 3;

// Displays one recorded service.
export function ServiceHistoryCard({
  service,
  grouped = false,
  onOpen,
}: {
  service: ServiceHistoryItem;
  // Set when the row sits inside a Month Group: the month carries the surface, and its
  // heading already states the year.
  grouped?: boolean;
  onOpen: () => void;
}): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();

  const shown = service.actions.slice(0, VISIBLE_ACTIONS);
  const hidden = service.actions.length - shown.length;

  const date =
    service.service_date === null
      ? null
      : grouped
        ? formatServiceDateShort(service.service_date, i18n.language)
        : formatServiceDate(service.service_date, i18n.language);

  return (
    <UnstyledButton
      onClick={onOpen}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "var(--mantine-spacing-sm)",
        transition: "transform 0.12s ease",
        ...(grouped ? {} : SERVICE_CARD_SURFACE),
      }}
      className="active:scale-[0.985]"
    >
      <Stack gap={6}>
        {/* What this row is and how much work it holds, with the price at the far edge. */}
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Text
            className="font-mono uppercase"
            fz={11}
            fw={600}
            c="primary.5"
            lts="0.08em"
            lineClamp={1}
          >
            {`${t("nav.service")} · ${t("service.actionCount", { count: service.action_count })}`}
          </Text>

          <Group gap={6} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
            {/* A service with no cost recorded shows no price; an explicit zero still
                reads as zero, because the user said the work was free. */}
            {service.total_cost !== null && (
              <Text className="font-mono" fz={14} fw={600} c="text.6">
                {formatCost(service.total_cost, user?.currency ?? null, i18n.language)}
              </Text>
            )}
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </Group>

        {/* The bike and when the work happened - the line that identifies the occasion.
            Uppercase is styling only, so the nickname keeps the case the user typed. */}
        <Group gap="sm" align="baseline" wrap="nowrap">
          <Text
            className="uppercase"
            ff="var(--mantine-font-family-headings)"
            fz={17}
            fw={600}
            c="text.6"
            lineClamp={1}
          >
            {service.bike_name ?? t("service.unknownBike")}
          </Text>
          {date !== null &&
            (grouped ? (
              <Text className="font-mono" fz={12} c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
                {date}
              </Text>
            ) : (
              <Text
                className="uppercase"
                ff="var(--mantine-font-family-headings)"
                fz={17}
                fw={600}
                c="text.6"
                style={{ flexShrink: 0 }}
              >
                {`· ${date}`}
              </Text>
            ))}
        </Group>

        {/* What was done, one Action per line. */}
        {shown.length === 0 ? (
          <Text className="font-mono" fz={13} c="var(--color-text-dim)">
            {t("service.noActions")}
          </Text>
        ) : (
          <Stack gap={2}>
            {shown.map((action, index) => (
              <Group key={`${action.name}-${index}`} gap={8} align="baseline" wrap="nowrap">
                <Box c="var(--color-text-dim)" style={{ flexShrink: 0 }}>
                  ·
                </Box>
                <Text className="font-mono" fz={13} c="var(--color-text-dim)" lineClamp={1}>
                  {catalogueLabel(action.i18n_key, action.name, t)}
                </Text>
              </Group>
            ))}
            {hidden > 0 && (
              <Text className="font-mono" fz={13} c="text.7" pl={20}>
                {t("service.moreActions", { count: hidden })}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </UnstyledButton>
  );
}
