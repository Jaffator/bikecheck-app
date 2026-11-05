// PROTOTYPE for #337, never merged: one excerpt per slide, on the app's own rows and surfaces.
import type { ComponentType, CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Group, Paper, SegmentedControl, SimpleGrid, Stack, Text } from "@mantine/core";
import { Bell } from "lucide-react";
import garageImage from "@/assets/images/empty_garage_bike.png";
import bikeImage from "@/assets/images/login_bike.webp";
import { FigureSection } from "@/components/FigureSection";
import { TrackedActionRow } from "@/features/service_tracking/ui/TrackedActionRow";
import { WeekdayBars } from "@/features/stats/ui/WeekdayBars";
import { CHAIN_ACTION, PADS_ACTION } from "./prototypeData";

const WEEKDAY_MINUTES = [30, 0, 95, 20, 0, 180, 140];

const CARD_STYLE: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "none",
  boxShadow: "var(--elev-panel)",
};

function ExcerptCard({ children }: { children: ReactNode }): ReactElement {
  return (
    <Paper radius="lg" p="md" style={CARD_STYLE}>
      {children}
    </Paper>
  );
}

function DashboardExcerpt(): ReactElement {
  return (
    <Stack gap="xs">
      <SegmentedControl fullWidth defaultValue="2026" data={["Tento měsíc", "2026", "Celkem"]} />
      <Paper radius="lg" style={{ ...CARD_STYLE, overflow: "hidden" }}>
        <FigureSection title="Vzdálenost" value="1 482" unit="km" chip="+12 %" detail="proti loňsku" />
        <Box style={{ borderTop: "1px solid var(--color-border)" }}>
          <FigureSection
            title="Čas v sedle"
            value="86"
            unit="h"
            graphic={<WeekdayBars minutes={WEEKDAY_MINUTES} label="Čas v sedle podle dne" />}
          />
        </Box>
      </Paper>
      <ExcerptCard>
        <TrackedActionRow action={CHAIN_ACTION} prefix="Orbea Rallon" onOpen={null} />
      </ExcerptCard>
    </Stack>
  );
}

function ServiceExcerpt(): ReactElement {
  return (
    <Stack gap="xs">
      <Paper radius="lg" p="md" style={{ ...CARD_STYLE, backgroundColor: "var(--mantine-color-cards-5)" }}>
        <Group gap="sm" wrap="nowrap" align="flex-start">
          <Box
            w={36}
            h={36}
            bg="primary.6"
            c="textDark.6"
            style={{ borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            <Bell size={20} />
          </Box>
          <Stack gap={2}>
            <Text fz={14} fw={600} c="text.6">
              Řetěz je na 94 %
            </Text>
            <Text fz={13} lh="18px" c="var(--color-text-dim)">
              Orbea Rallon: je čas na výměnu.
            </Text>
          </Stack>
        </Group>
      </Paper>
      <ExcerptCard>
        <Stack gap="md">
          <TrackedActionRow action={CHAIN_ACTION} prefix={null} onOpen={null} />
          <TrackedActionRow action={PADS_ACTION} prefix={null} onOpen={null} />
        </Stack>
      </ExcerptCard>
    </Stack>
  );
}

function SetupFigure({ value, label }: { value: string; label: string }): ReactElement {
  return (
    <Stack gap={2}>
      <Text className="tabular-nums" fz={17} fw={600} c="text.6">
        {value}
      </Text>
      <Text fz={12} c="var(--color-muted)">
        {label}
      </Text>
    </Stack>
  );
}

function SetupExcerpt(): ReactElement {
  return (
    <Stack gap="xs">
      <Paper radius="lg" style={{ ...CARD_STYLE, overflow: "hidden" }}>
        <img src={bikeImage} alt="" style={{ display: "block", width: "100%", height: 170, objectFit: "cover" }} />
      </Paper>
      <SegmentedControl fullWidth defaultValue="Trail" data={["Trail", "Race", "Park"]} />
      <ExcerptCard>
        <SimpleGrid cols={3} spacing="xs">
          <SetupFigure value="1,7 bar" label="Přední" />
          <SetupFigure value="72 psi" label="Vidlice" />
          <SetupFigure value="28 %" label="Sag" />
        </SimpleGrid>
      </ExcerptCard>
    </Stack>
  );
}

function ShareExcerpt(): ReactElement {
  return (
    <Stack gap="xs">
      <ExcerptCard>
        <Stack gap="sm">
          <Text fz={14} fw={600} c="text.6">
            Kdo uvidí tvůj profil
          </Text>
          <SegmentedControl fullWidth defaultValue="Veřejně" data={["Nikdo", "Sledující", "Veřejně"]} />
        </Stack>
      </ExcerptCard>
      <ExcerptCard>
        <Group gap="sm" wrap="nowrap">
          <Box
            w={40}
            h={48}
            bg="text.6"
            c="textDark.6"
            fz={11}
            fw={700}
            style={{ borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            PDF
          </Box>
          <Stack gap={2}>
            <Text fz={14} fw={600} c="text.6">
              Servisní report
            </Text>
            <Text fz={13} c="var(--color-muted)">
              Orbea Rallon · celá historie
            </Text>
          </Stack>
        </Group>
      </ExcerptCard>
    </Stack>
  );
}

function FirstBikeExcerpt(): ReactElement {
  return (
    <img
      src={garageImage}
      alt=""
      style={{ display: "block", width: "100%", maxHeight: "46dvh", objectFit: "cover", borderRadius: 16 }}
    />
  );
}

export const WELCOME_EXCERPTS: ComponentType[] = [
  DashboardExcerpt,
  ServiceExcerpt,
  ShareExcerpt,
  SetupExcerpt,
  FirstBikeExcerpt,
];
