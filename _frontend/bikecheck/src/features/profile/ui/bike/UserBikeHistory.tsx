// The service history of somebody's bike: what the whole record adds up to, then every
// Service by month, the older ones a tap away. Money only where the owner lets it out;
// nothing here opens - a reader looks, the owner's own history has the detail.
import { Fragment, type ReactElement } from "react";
import { Badge, Box, Button, Divider, Group, Stack, Text } from "@mantine/core";
import { Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SERVICE_CARD_SURFACE } from "@/features/service/serviceCardSurface";
import {
  formatMonthHeading,
  formatServiceDateShort,
  groupByServiceDate,
  type ServiceMonthGroup,
} from "@/features/service/serviceDates";
import { useSeededName } from "@/i18n/useSeededName";
import { formatCost } from "@/utils/money";
import { useProfileBikeServices } from "../../profile.queries";
import { monthSum } from "../../profileFormat";
import { EYEBROW } from "../../profileSurface";
import type { ProfileHistory, ProfileService } from "../../profile.types";
import { UserBikeSectionTitle } from "./UserBikeSectionTitle";

interface UserBikeHistoryProps {
  handle: string;
  bikeId: number;
  history: ProfileHistory;
}

export function UserBikeHistory({ handle, bikeId, history }: UserBikeHistoryProps): ReactElement {
  const { t, i18n } = useTranslation();
  const older = useProfileBikeServices(handle, bikeId, history.services.length);

  // The bike brought the first page; every page tapped in since continues the same list,
  // so a month that straddles the boundary stays one group.
  const services = [...history.services, ...(older.data?.pages.flatMap((page) => page.services) ?? [])];
  const total = older.data?.pages.at(-1)?.total_count ?? history.total_count;
  const remaining = Math.max(total - services.length, 0);
  const spend = history.totals.spend;

  return (
    <Stack gap="sm">
      <Box style={SERVICE_CARD_SURFACE}>
        <UserBikeSectionTitle icon={<Wrench size={16} />}>{t("sharing.bikeHistoryTitle")}</UserBikeSectionTitle>
        <Group gap="lg" wrap="nowrap" px="md" pb="md">
          <Tile label={t("sharing.figureServices")} value={String(history.totals.services)} />
          <Divider orientation="vertical" color="var(--color-border-subtle)" />
          <Tile label={t("sharing.historyReplacements")} value={String(history.totals.replacements)} />
          {spend !== undefined && (
            <>
              <Divider orientation="vertical" color="var(--color-border-subtle)" />
              <Tile label={t("sharing.historySpend")} value={formatCost(spend.amount, spend.currency, i18n.language)} />
            </>
          )}
        </Group>
      </Box>

      {groupByServiceDate(services, (service) => service.date).map((group) => (
        <MonthGroup key={group.key} group={group} />
      ))}

      {older.isError && (
        <Text fz={13} c="var(--color-text-dim)" ta="center">
          {t("sharing.olderFailed")}
        </Text>
      )}

      {remaining > 0 && (
        <Button
          size="sm"
          radius="xl"
          variant="outline"
          loading={older.isFetchingNextPage}
          onClick={() => void older.fetchNextPage()}
        >
          {t("sharing.showOlder", { count: remaining })}
        </Button>
      )}
    </Stack>
  );
}

function Tile({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text {...EYEBROW}>{label}</Text>
      <Text className="font-mono" fz={17} fw={600} c="text.6" lh={1.1} lineClamp={1}>
        {value}
      </Text>
    </Stack>
  );
}

// One month as one card, its Services the rows. The month sum stands only where a price
// went out; the undated group closes the list under a fainter heading.
function MonthGroup({ group }: { group: ServiceMonthGroup<ProfileService> }): ReactElement {
  const { t, i18n } = useTranslation();
  const sum = monthSum(group.services);

  return (
    <Stack gap={6}>
      <Group justify="space-between" wrap="nowrap" px="xs">
        <Text {...EYEBROW} c={group.month === null ? "text.9" : EYEBROW.c}>
          {group.month === null ? t("sharing.noDate") : formatMonthHeading(group.month)}
        </Text>
        {sum !== null && (
          <Text className="font-mono" fz={11} c="primary.6" style={{ flexShrink: 0 }}>
            {formatCost(sum.amount, sum.currency, i18n.language)}
          </Text>
        )}
      </Group>
      <Box style={SERVICE_CARD_SURFACE}>
        {group.services.map((service, index) => (
          <Fragment key={service.id}>
            {index > 0 && <Divider color="var(--color-border-subtle)" />}
            <ServiceRow service={service} />
          </Fragment>
        ))}
      </Box>
    </Stack>
  );
}

// One Service: when, what was done, what it touched, and the price where it goes out.
function ServiceRow({ service }: { service: ProfileService }): ReactElement {
  const { t, i18n } = useTranslation();
  const seededName = useSeededName();
  const title = service.actions.map((action) => seededName(action.i18n_key, action.name)).join(" · ");

  return (
    <Stack gap={6} p="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={3} style={{ minWidth: 0 }}>
          {service.date !== null && <Text {...EYEBROW}>{formatServiceDateShort(service.date, i18n.language)}</Text>}
          <Group gap={6} wrap="nowrap" align="center">
            <Text fz={15} fw={600} c="text.6" lineClamp={2} lh={1.25}>
              {title === "" ? t("service.noActions") : title}
            </Text>
            {service.is_replacement && (
              <Badge size="xs" radius="sm" variant="light" color="primary.6" style={{ flexShrink: 0 }}>
                {t("sharing.replacement")}
              </Badge>
            )}
          </Group>
        </Stack>
        {service.cost !== undefined && (
          <Text className="font-mono" fz={13} fw={600} c="primary.6" style={{ flexShrink: 0 }}>
            {formatCost(service.cost.amount, service.cost.currency, i18n.language)}
          </Text>
        )}
      </Group>
      {service.parts.length > 0 && (
        <Group gap={6}>
          {service.parts.map((part) => (
            <Text
              key={part.name}
              fz={11}
              c="var(--color-text-dim)"
              px={8}
              py={2}
              style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 9999, whiteSpace: "nowrap" }}
            >
              {seededName(part.i18n_key, part.name)}
            </Text>
          ))}
        </Group>
      )}
    </Stack>
  );
}
