// PROTOTYPE #129 — throwaway. The three sections under a bike's hero on somebody's profile,
// in the app's tokens: the Setup card (#120 variant C), the build as plain rows, and the
// history as Month Groups with "Zobrazit starší". Nothing here opens anything.
import { Fragment, useState, type ReactElement, type ReactNode } from "react";
import { Badge, Box, Button, Chip, Collapse, Divider, Group, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import dayjs from "dayjs";
import { ChevronDown, ChevronUp, SlidersHorizontal, Wrench } from "lucide-react";
import { IoLogoWebComponent } from "react-icons/io5";
import { groupIcon } from "@/assets/icons/svg_icons/groups";
import { chipStyles } from "@/features/add_bike_page/formStyles";
import { SERVICE_CARD_SURFACE } from "@/features/service/serviceCardSurface";
import { formatMonthHeading, formatServiceDateShort } from "@/features/service/serviceDates";
import { formatCost } from "@/utils/money";
import { mountedTire, type MockBike, type MockGarage, type MockService, type MockSetupProfile } from "./profile.mock";
import { formatKm } from "./profile.figures";
import { EYEBROW, PANEL, SECONDARY_BUTTON } from "./shared";

// One page of history, as the web page pages it (#117).
const HISTORY_PAGE = 20;

function SectionTitle({ icon, children, aside }: { icon: ReactNode; children: ReactNode; aside?: ReactNode }): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap" px="md" pt="md" pb="xs">
      <Group gap={8} wrap="nowrap">
        <Box style={{ display: "flex", color: "var(--color-text-dim)", flexShrink: 0 }}>{icon}</Box>
        <Text fz={15} fw={600} c="text.6">
          {children}
        </Text>
      </Group>
      {aside}
    </Group>
  );
}

// ---- Setup -------------------------------------------------------------------------

function Reading({ label, value, under }: { label: string; value: string; under?: string | null }): ReactElement {
  return (
    <Stack gap={2} style={{ minWidth: 0 }}>
      <Text {...EYEBROW} lineClamp={1}>
        {label}
      </Text>
      <Text className="font-mono" fz={17} fw={600} c="text.6" lh={1.1}>
        {value}
      </Text>
      {under !== undefined && under !== null && (
        <Text fz={11} c="var(--color-text-dim)" lineClamp={1}>
          {under}
        </Text>
      )}
    </Stack>
  );
}

function formatPressure(value: number, unit: MockGarage["tireUnit"]): string {
  // The mock keeps psi; bar is what the owner would see if their unit says so.
  const shown = unit === "bar" ? value / 14.504 : value;
  return `${new Intl.NumberFormat("cs", { maximumFractionDigits: unit === "bar" ? 2 : 1 }).format(shown)} ${unit}`;
}

function ClickRow({ label, clicks }: { label: string; clicks: { lsr: number; hsr: number; lsc: number; hsc: number } }): ReactElement {
  const cells: [string, number][] = [
    ["LSR", clicks.lsr],
    ["HSR", clicks.hsr],
    ["LSC", clicks.lsc],
    ["HSC", clicks.hsc],
  ];
  return (
    <Group justify="space-between" wrap="nowrap" py={6}>
      <Text fz={13} c="text.6" fw={600}>
        {label}
      </Text>
      <Group gap="md" wrap="nowrap">
        {cells.map(([name, value]) => (
          <Stack key={name} gap={0} align="center">
            <Text {...EYEBROW} fz={10}>
              {name}
            </Text>
            <Text className="font-mono" fz={13} c="text.6">
              {value}
            </Text>
          </Stack>
        ))}
      </Group>
    </Group>
  );
}

export function SetupCard({ bike, garage }: { bike: MockBike; garage: MockGarage }): ReactElement | null {
  const [index, setIndex] = useState(0);
  const [clicksOpen, setClicksOpen] = useState(false);
  // No saved profile = no card, not an empty one (#120).
  if (bike.profiles.length === 0) return null;
  const profile: MockSetupProfile = bike.profiles[index] ?? bike.profiles[0];
  const front = mountedTire(bike, "Přední");
  const rear = mountedTire(bike, "Zadní");
  const tireName = (tire: typeof front): string | null => (tire ? `${tire.brand} ${tire.model}` : null);

  return (
    <Paper radius="lg" style={{ ...PANEL, overflow: "hidden" }}>
      <SectionTitle
        icon={<SlidersHorizontal size={16} />}
        aside={
          bike.profiles.length > 1 ? (
            <Group gap={6} wrap="nowrap">
              {bike.profiles.map((item, itemIndex) => (
                <Chip
                  key={item.name}
                  size="xs"
                  radius="xl"
                  icon={false}
                  checked={itemIndex === index}
                  onChange={() => setIndex(itemIndex)}
                  styles={chipStyles(itemIndex === index, { wrap: false, opaque: true })}
                >
                  {item.name}
                </Chip>
              ))}
            </Group>
          ) : undefined
        }
      >
        Setup
      </SectionTitle>

      <SimpleGrid cols={2} spacing="md" px="md" pb="md">
        <Reading label="Přední plášť" value={formatPressure(profile.frontTire, garage.tireUnit)} under={garage.sections.components ? tireName(front) : null} />
        <Reading label="Zadní plášť" value={formatPressure(profile.rearTire, garage.tireUnit)} under={garage.sections.components ? tireName(rear) : null} />
        {profile.fork && <Reading label="Vidlice" value={`${profile.fork.psi} psi`} />}
        {profile.fork && <Reading label="Sag vidlice" value={`${profile.fork.sag} %`} />}
        {profile.shock && <Reading label="Tlumič" value={`${profile.shock.psi} psi`} />}
        {profile.shock && <Reading label="Sag tlumiče" value={`${profile.shock.sag} %`} />}
      </SimpleGrid>

      {(profile.fork || profile.shock) && (
        <>
          <UnstyledButton
            onClick={() => setClicksOpen((open) => !open)}
            px="md"
            py={12}
            w="100%"
            style={{ borderTop: "1px solid var(--color-border-subtle)", color: "var(--mantine-color-text-6)" }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Text fz={13} fw={600} c="text.6">
                Tokeny a kliky
              </Text>
              {clicksOpen ? <ChevronUp size={16} color="var(--color-text-dim)" /> : <ChevronDown size={16} color="var(--color-text-dim)" />}
            </Group>
          </UnstyledButton>
          <Collapse expanded={clicksOpen}>
            <Stack gap={0} px="md" pb="sm">
              <Text fz={11} c="var(--color-text-dim)" pb={4}>
                Kliky od plně zavřeného.
              </Text>
              {profile.fork && <ClickRow label={`Vidlice · ${profile.fork.tokens} tok.`} clicks={profile.fork.clicks} />}
              {profile.fork && profile.shock && <Divider color="var(--color-border-subtle)" />}
              {profile.shock && <ClickRow label={`Tlumič · ${profile.shock.tokens} tok.`} clicks={profile.shock.clicks} />}
            </Stack>
          </Collapse>
        </>
      )}
    </Paper>
  );
}

// ---- Build --------------------------------------------------------------------------

function categoryMark(group: string): ReactElement {
  const Icon = groupIcon(group);
  if (Icon === null) return <Wrench size={20} />;
  return <Icon width={22} height={22} />;
}

export function ComponentsPanel({ bike }: { bike: MockBike }): ReactElement {
  const total = bike.categories.reduce((sum, category) => sum + category.parts.length, 0);
  return (
    <Paper radius="lg" style={{ ...PANEL, overflow: "hidden" }}>
      <SectionTitle
        icon={<IoLogoWebComponent size={16} />}
        aside={
          <Text {...EYEBROW}>
            {total} dílů
          </Text>
        }
      >
        Osazení
      </SectionTitle>
      <Stack gap={0}>
        {bike.categories.map((category) => (
          <Box key={category.name} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
            {/* The category heads its parts; nothing folds, since nothing here is acted on. */}
            <Group gap="sm" wrap="nowrap" px="md" pt={12} pb={4}>
              <Box style={{ display: "flex", color: "var(--mantine-color-text-8)", flexShrink: 0 }}>{categoryMark(category.group)}</Box>
              <Text fz={15} fw={600} c="text.6" lineClamp={1}>
                {category.name}
              </Text>
              <Text {...EYEBROW} ml="auto">
                {category.parts.length}
              </Text>
            </Group>
            {category.parts.map((part, partIndex) => (
              <Group key={`${part.type}-${partIndex}`} gap="sm" wrap="nowrap" align="flex-start" px="md" py={8} pl={50}>
                <Stack gap={1} style={{ minWidth: 0, flex: 1 }}>
                  <Group gap={6} wrap="nowrap">
                    <Text fz={14} fw={600} c="text.6" lineClamp={1}>
                      {part.type}
                    </Text>
                    {part.position !== null && (
                      <Text {...EYEBROW} style={{ flexShrink: 0 }}>
                        {part.position}
                      </Text>
                    )}
                  </Group>
                  <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
                    {part.brand} {part.model} · {part.spec}
                  </Text>
                </Stack>
                <Text className="font-mono" fz={11} c="var(--color-text-dim)" style={{ flexShrink: 0, whiteSpace: "nowrap" }} pt={2}>
                  {part.km !== null ? formatKm(part.km) : part.since}
                </Text>
              </Group>
            ))}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}

// ---- History ------------------------------------------------------------------------

function Tile({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Stack gap={2}>
      <Text {...EYEBROW}>{label}</Text>
      <Text className="font-mono" fz={17} fw={600} c="text.6">
        {value}
      </Text>
    </Stack>
  );
}

// Groups in the order they arrive; the undated ones sit at the end as one group of their own.
function groupByMonth(items: MockService[]): { key: string; label: string; services: MockService[] }[] {
  const groups: { key: string; label: string; services: MockService[] }[] = [];
  for (const service of items) {
    const key = service.date === null ? "undated" : dayjs(service.date).format("YYYY-MM");
    const current = groups[groups.length - 1];
    if (current && current.key === key) {
      current.services.push(service);
      continue;
    }
    groups.push({ key, label: service.date === null ? "DATUM NEUVEDENO" : formatMonthHeading(dayjs(service.date)), services: [service] });
  }
  return groups;
}

function ServiceRow({ service, garage }: { service: MockService; garage: MockGarage }): ReactElement {
  return (
    <Stack gap={6} p="sm">
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="sm">
        <Stack gap={3} style={{ minWidth: 0 }}>
          <Text className="font-mono uppercase" fz={11} c="var(--color-text-dim)" lts="0.08em">
            {service.date === null ? "—" : formatServiceDateShort(service.date, "cs")}
          </Text>
          <Group gap={6} wrap="nowrap" align="center">
            <Text fz={15} fw={600} c="text.6" lineClamp={2} style={{ lineHeight: 1.25 }}>
              {service.actions.join(" · ")}
            </Text>
            {service.replacement && (
              <Badge size="xs" radius="sm" variant="light" color="primary.6" style={{ flexShrink: 0 }}>
                Výměna
              </Badge>
            )}
          </Group>
        </Stack>
        {garage.sections.costs && service.cost !== null && (
          <Text className="font-mono" fz={13} fw={600} c="primary.6" style={{ flexShrink: 0 }}>
            {formatCost(service.cost, garage.currency, "cs")}
          </Text>
        )}
      </Group>
      <Group gap={6}>
        {service.parts.map((name) => (
          <Text
            key={name}
            fz={11}
            c="var(--color-text-dim)"
            px={8}
            py={2}
            style={{ border: "1px solid var(--color-border-subtle)", borderRadius: 9999, whiteSpace: "nowrap" }}
          >
            {name}
          </Text>
        ))}
      </Group>
    </Stack>
  );
}

export function HistorySection({ bike, garage }: { bike: MockBike; garage: MockGarage }): ReactElement {
  const [shown, setShown] = useState(HISTORY_PAGE);
  const all = bike.services;
  const replacements = all.filter((service) => service.replacement).length;
  const spend = all.reduce((sum, service) => sum + (service.cost ?? 0), 0);
  const visible = all.slice(0, shown);
  const older = all.length - visible.length;

  return (
    <Stack gap="sm">
      <Box style={{ ...SERVICE_CARD_SURFACE, padding: "var(--mantine-spacing-md)" }}>
        <Stack gap="xs">
          <Group gap={8} wrap="nowrap">
            <Wrench size={16} color="var(--color-text-dim)" />
            <Text fz={15} fw={600} c="text.6">
              Servisní historie
            </Text>
          </Group>
          <Group gap="lg" wrap="nowrap">
            <Tile label="Servisů" value={String(all.length)} />
            <Divider orientation="vertical" color="var(--color-border-subtle)" />
            <Tile label="Výměn" value={String(replacements)} />
            {garage.sections.costs && (
              <>
                <Divider orientation="vertical" color="var(--color-border-subtle)" />
                <Tile label="Útrata" value={formatCost(spend, garage.currency, "cs")} />
              </>
            )}
          </Group>
        </Stack>
      </Box>

      {groupByMonth(visible).map((group) => (
        <Stack key={group.key} gap={6}>
          <Text {...EYEBROW} px="xs" c={group.key === "undated" ? "var(--mantine-color-text-9)" : undefined}>
            {group.label}
          </Text>
          <Box style={SERVICE_CARD_SURFACE}>
            {group.services.map((service, index) => (
              <Fragment key={service.id}>
                {index > 0 && <Divider color="var(--color-border-subtle)" />}
                <ServiceRow service={service} garage={garage} />
              </Fragment>
            ))}
          </Box>
        </Stack>
      ))}

      {older > 0 && (
        <Button variant="default" radius="md" styles={{ root: SECONDARY_BUTTON }} onClick={() => setShown((count) => count + HISTORY_PAGE)}>
          Zobrazit starší ({older})
        </Button>
      )}
    </Stack>
  );
}
