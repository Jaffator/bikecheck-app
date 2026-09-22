// UI component using feature hooks.
import type { ReactElement } from "react";
import { Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { SERVICE_CARD_SURFACE } from "@/features/service/serviceCardSurface";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { formatServiceDate, formatServiceDateShort } from "@/features/service/serviceDates";
import type { ServiceHistoryItem } from "@/features/service/service.types";
import BikeIcon from "@/assets/icons/svg_icons/bike.svg?react";

// As many Actions as a card names before it starts to read as a list of its own. What is
// left over is counted, and the detail has them all.
const VISIBLE_ACTIONS = 3;

// The bike's mark, sized to the metadata line it rides on.
const BIKE_ICON_SIZE = 13;

// Displays one recorded service.
export function ServiceHistoryCard({
  service,
  grouped = false,
  flat = false,
  onOpen,
}: {
  service: ServiceHistoryItem;
  // Set when the card sits inside a Month Group, whose heading already states the year.
  grouped?: boolean;
  // Set when the row sits inside one shared card with the others: no surface of its own,
  // and a chevron to say it still opens.
  flat?: boolean;
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
        ...(flat ? {} : SERVICE_CARD_SURFACE),
      }}
      className="active:scale-[0.985]"
    >
      <Stack gap={5}>
        {/* Which bike it was and when, with the price at the far edge. */}
        <Group justify="space-between" align="center" wrap="nowrap" gap="sm">
          <Group gap={5} align="center" wrap="nowrap" style={{ minWidth: 0 }}>
            <BikeIcon
              width={BIKE_ICON_SIZE}
              height={BIKE_ICON_SIZE}
              style={{ flexShrink: 0 }}
              color="var(--mantine-color-primary-5)"
            />
            <Text className="font-mono uppercase" fz={11} fw={400} c="text.8" lts="0.08em" lineClamp={1}>
              {[service.bike_name ?? t("service.unknownBike"), date].filter((part) => part !== null).join(" · ")}
            </Text>
          </Group>

          <Group gap={4} align="center" wrap="nowrap" style={{ flexShrink: 0 }}>
            {/* A service with no cost recorded shows no price; an explicit zero still
                reads as zero, because the user said the work was free. */}
            {service.total_cost !== null && (
              <Text
                className="font-mono"
                fz={13}
                fw={service.total_cost === 0 ? 400 : 600}
                // A zero is still a price, but not one worth the weight.
                c={service.total_cost === 0 ? "var(--color-text-dim)" : "text.7"}
              >
                {formatCost(service.total_cost, user?.currency ?? null, i18n.language)}
              </Text>
            )}
            {flat && <ChevronRight size={14} color="var(--color-text-dim)" />}
          </Group>
        </Group>

        {/* What was done, one Action per line. */}
        {shown.length === 0 ? (
          <Text className="font-mono" fz={13} c="var(--color-text-dim)">
            {t("service.noActions")}
          </Text>
        ) : (
          <Stack gap={4}>
            {shown.map((action, index) => (
              <Text
                key={`${action.name}-${index}`}
                className="font-sans"
                fz={13}
                fw={600}
                c="text.6"
                lh={1.15}
                lineClamp={1}
              >
                {catalogueLabel(action.i18n_key, action.name, t)}
              </Text>
            ))}
            {hidden > 0 && (
              <Text className="font-sans" fz={13} c="text.7">
                {t("service.moreActions", { count: hidden })}
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </UnstyledButton>
  );
}
