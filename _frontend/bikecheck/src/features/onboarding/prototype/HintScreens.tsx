// PROTOTYPE for #337, never merged: every Hint on a sample of its screen, the real rows where they take props.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Button, Group, Paper, SegmentedControl, Stack, Text, Title } from "@mantine/core";
import { Clock, Mountain, Route } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CompletedRideCard, HistoryMetric } from "@/components/CompletedRideCard";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { RouteMap } from "@/components/RouteMap";
import { PROFILE_VISIBILITIES } from "@/features/profile/profile.types";
import { VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { ReportCard } from "@/features/report/ui/ReportCard";
import { draftOf, type CheckInDraft } from "@/features/rides/checkIn";
import { RideCheckInFields } from "@/features/rides/ui/RideCheckInFields";
import { TrackedActionRow } from "@/features/service_tracking/ui/TrackedActionRow";
import { SetupSection } from "@/features/setup/ui/SetupSection";
import { HintBubble } from "./HintBubble";
import { CHAIN_ACTION, FORK_ACTION, PADS_ACTION, PERIOD_REPORT, SAMPLE_RIDES, SERVICE_REPORT } from "./prototypeData";

const NO_ACTION = (): void => {};

const SHEET_STYLES = {
  content: { height: "auto", maxHeight: "88dvh" },
  title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
};

const ROW_CARD: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "none",
  boxShadow: "var(--elev-panel)",
};

function ScreenFrame({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <Box mih="100dvh" bg="background.9" pt={64} pb={32}>
      <Stack gap="sm" px={20} maw={680}>
        <Title order={1} fz={22} fw={700} lts="var(--tracking-title)" c="text.6">
          {title}
        </Title>
        {children}
      </Stack>
    </Box>
  );
}

function RowCard({ children }: { children: ReactElement }): ReactElement {
  return (
    <Paper radius="lg" p="md" style={ROW_CARD}>
      {children}
    </Paper>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text fz={14} c="text.6">
        {label}
      </Text>
      <Text className="tabular-nums" fz={14} c="var(--color-text-dim)">
        {value}
      </Text>
    </Group>
  );
}

export function PartsHintScreen(): ReactElement {
  const [sheetOpened, setSheetOpened] = useState<boolean>(false);
  const open = (): void => setSheetOpened(true);

  return (
    <ScreenFrame title="Rallon M-Team">
      <HintBubble hintKey="tracked_actions" text="% = jak daleko je díl k servisu. Od 75 % tě appka upozorní." when={!sheetOpened}>
        <RowCard>
          <TrackedActionRow action={CHAIN_ACTION} prefix={null} onOpen={open} />
        </RowCard>
      </HintBubble>
      <RowCard>
        <TrackedActionRow action={PADS_ACTION} prefix={null} onOpen={open} />
      </RowCard>
      <RowCard>
        <TrackedActionRow action={FORK_ACTION} prefix={null} onOpen={open} />
      </RowCard>

      <ResponsiveSheet
        opened={sheetOpened}
        onClose={() => setSheetOpened(false)}
        desktop="panel"
        title="Výměna řetězu"
        styles={SHEET_STYLES}
      >
        <Stack gap="md">
          <TrackedActionRow action={CHAIN_ACTION} prefix={null} onOpen={null} />
          <HintBubble
            hintKey="tracked_action_detail"
            text="Interval si můžeš upravit, nebo upozornění ztlumit."
            when={sheetOpened}
            inSheet
          >
            <DetailRow label="Interval" value="2 000 km" />
          </HintBubble>
          <DetailRow label="Upozornění" value="Zapnuto" />
          <Button radius="md" c="textDark.6">
            Zapsat servis
          </Button>
        </Stack>
      </ResponsiveSheet>
    </ScreenFrame>
  );
}

function SampleRideCard({ index }: { index: number }): ReactElement {
  const ride = SAMPLE_RIDES[index];

  return (
    <CompletedRideCard
      onOpen={NO_ACTION}
      leading={<RouteMap polyline={ride.polyline} width={50} height={50} simplify={1} />}
      title={ride.name}
      subtitle={ride.date}
      metrics={
        <>
          <HistoryMetric icon={Route}>{ride.distance}</HistoryMetric>
          <HistoryMetric icon={Clock}>{ride.time}</HistoryMetric>
          <HistoryMetric icon={Mountain}>{ride.climb}</HistoryMetric>
        </>
      }
    />
  );
}

export function RidesHintScreen(): ReactElement {
  return (
    <ScreenFrame title="Jízdy">
      <Group gap="lg">
        <Text fz={14} fw={600} c="var(--color-muted)">
          Dokončené
        </Text>
        <Text fz={14} fw={600} c="primary.6">
          Nepřiřazené
        </Text>
      </Group>
      <HintBubble hintKey="unassigned_ride" text="Jízda ze Stravy bez kola. Přiřaď ji, ať opotřebuje díly.">
        <SampleRideCard index={0} />
      </HintBubble>
      <SampleRideCard index={1} />
    </ScreenFrame>
  );
}

export function CheckInHintScreen(): ReactElement {
  const [opened, setOpened] = useState<boolean>(true);
  const [draft, setDraft] = useState<CheckInDraft>(draftOf(null));

  return (
    <ScreenFrame title="Jízdy">
      <Button variant="outline" radius="md" style={{ alignSelf: "flex-start" }} onClick={() => setOpened(true)}>
        Otevřít jízdu
      </Button>
      <ResponsiveSheet opened={opened} onClose={() => setOpened(false)} desktop="modal" title="Odpolední okruh" styles={SHEET_STYLES}>
        <HintBubble
          hintKey="check_in"
          text="Zapiš, jestli bylo kolo v pořádku, nebo co jsi na něm zaznamenal (vrzání, měkká brzda…)."
          when={opened}
          inSheet
        >
          <RideCheckInFields draft={draft} onChange={setDraft} />
        </HintBubble>
      </ResponsiveSheet>
    </ScreenFrame>
  );
}

export function SetupHintScreen(): ReactElement {
  return (
    <ScreenFrame title="Setup">
      <HintBubble hintKey="setup" text="Ulož si tlaky a kliky do profilů (Trail, Race…).">
        <SegmentedControl fullWidth defaultValue="Trail" data={["Trail", "Race", "Park"]} />
      </HintBubble>
      <SetupSection title="Vidlice" subtitle="Fox 38 Factory">
        <DetailRow label="Tlak" value="72 psi" />
        <DetailRow label="Sag" value="28 %" />
      </SetupSection>
      <SetupSection title="Pneu">
        <DetailRow label="Přední" value="1,7 bar" />
        <DetailRow label="Zadní" value="1,9 bar" />
      </SetupSection>
    </ScreenFrame>
  );
}

export function ReportsHintScreen(): ReactElement {
  return (
    <ScreenFrame title="Reporty">
      <HintBubble
        hintKey="reports"
        text="Vytvoř report celého kola, nebo jen vybraného servisu. Pošli ho jako PDF, nebo sdílej odkazem."
      >
        <ReportCard report={PERIOD_REPORT} onRevoke={NO_ACTION} onDelete={NO_ACTION} />
      </HintBubble>
      <ReportCard report={SERVICE_REPORT} onRevoke={NO_ACTION} onDelete={NO_ACTION} />
    </ScreenFrame>
  );
}

export function SharingHintScreen(): ReactElement {
  const { t } = useTranslation();
  const [opened, setOpened] = useState<boolean>(true);
  const data = PROFILE_VISIBILITIES.map((value) => ({ value, label: t(VISIBILITY_LABEL_KEY[value]) }));

  return (
    <ScreenFrame title="Sdílení">
      <Button variant="outline" radius="md" style={{ alignSelf: "flex-start" }} onClick={() => setOpened(true)}>
        Otevřít sdílení
      </Button>
      <ResponsiveSheet opened={opened} onClose={() => setOpened(false)} desktop="modal" title="Sdílení profilu" styles={SHEET_STYLES}>
        <Stack gap="md">
          <HintBubble
            hintKey="sharing"
            text="Profil můžeš sdílet jen se sledujícími v appce, nebo veřejným odkazem pro kohokoli."
            when={opened}
            inSheet
          >
            <SegmentedControl fullWidth defaultValue="FOLLOWERS" data={data} />
          </HintBubble>
          <DetailRow label="Komponenty" value="Zapnuto" />
          <DetailRow label="Setup" value="Zapnuto" />
          <DetailRow label="Historie servisu" value="Vypnuto" />
          <DetailRow label="Náklady" value="Vypnuto" />
        </Stack>
      </ResponsiveSheet>
    </ScreenFrame>
  );
}
