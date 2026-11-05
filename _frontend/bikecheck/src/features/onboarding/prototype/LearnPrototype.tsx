// PROTOTYPE for #337, never merged: Learn the app, as a Help menu on desktop and a section of Settings on a phone.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Card, Group, Menu, Stack, Switch, Text, UnstyledButton } from "@mantine/core";
import { Bell, ChevronRight, CircleHelp, House, Lightbulb, MessageCircleMore, RotateCcw, Route, Users, Wrench } from "lucide-react";
import logoName from "@/assets/logo_name.svg";
import { useIsDesktop } from "@/layout/breakpoints";
import { useHintStore } from "./prototypeStore";

const CARD_STYLE: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  border: "none",
  boxShadow: "var(--elev-panel)",
};
const ICON_SIZE = 18;

interface LearnProps {
  onReplay: () => void;
}

// The Settings switch, drawn the same; here it reads and writes the prototype's store.
function TipsSwitch({ readOnly = false }: { readOnly?: boolean }): ReactElement {
  const enabled = useHintStore((state) => state.enabled);
  const setEnabled = useHintStore((state) => state.setEnabled);

  return (
    <Switch
      withThumbIndicator={false}
      checked={enabled}
      readOnly={readOnly}
      onChange={(event) => setEnabled(event.currentTarget.checked)}
      aria-label="Tipy na nových obrazovkách"
      style={readOnly ? { pointerEvents: "none" } : undefined}
      styles={{
        track: {
          backgroundColor: enabled ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
          borderColor: "var(--mantine-color-other-borderSolid)",
        },
        thumb: { backgroundColor: enabled ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)" },
      }}
    />
  );
}

function ShellRow({ icon, label }: { icon: ReactNode; label: string }): ReactElement {
  return (
    <Group gap={10} wrap="nowrap" h={40} px={10} c="var(--color-text-dim)">
      {icon}
      <Text fz={14} fw={500}>
        {label}
      </Text>
    </Group>
  );
}

function HelpMenu({ onReplay }: LearnProps): ReactElement {
  const enabled = useHintStore((state) => state.enabled);
  const setEnabled = useHintStore((state) => state.setEnabled);

  return (
    <Menu position="right-end" width={320} radius="md" offset={16}>
      <Menu.Target>
        <UnstyledButton h={40} px={10} c="var(--color-text-dim)" style={{ borderRadius: 10 }}>
          <Group gap={10} wrap="nowrap">
            <CircleHelp size={ICON_SIZE} />
            <Text fz={14} fw={500}>
              Nápověda
            </Text>
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label fz={11} tt="uppercase" lts="var(--tracking-label)" c="var(--color-text-dim)">
          Učit se appku
        </Menu.Label>
        <Menu.Item color="text" fw={600} leftSection={<RotateCcw size={16} />} onClick={onReplay}>
          Spustit úvod znovu
        </Menu.Item>
        <Menu.Item
          component="div"
          color="text"
          fw={600}
          closeMenuOnClick={false}
          leftSection={<Lightbulb size={16} />}
          rightSection={<TipsSwitch readOnly />}
          onClick={() => setEnabled(!enabled)}
        >
          Tipy na nových obrazovkách
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

function LearnDesktop({ onReplay }: LearnProps): ReactElement {
  return (
    <Group gap={0} wrap="nowrap" align="stretch" mih="100dvh" bg="background.9">
      <Stack gap={4} w={240} p="md" bg="background.8" style={{ flexShrink: 0, borderRight: "1px solid var(--color-border-subtle)" }}>
        <img src={logoName} alt="BikeCheck" style={{ height: 24, alignSelf: "flex-start", margin: "4px 10px 16px" }} />
        <ShellRow icon={<House size={ICON_SIZE} />} label="Domů" />
        <ShellRow icon={<Wrench size={ICON_SIZE} />} label="Servis" />
        <ShellRow icon={<Route size={ICON_SIZE} />} label="Jízdy" />
        <ShellRow icon={<Users size={ICON_SIZE} />} label="Jezdci" />
        <ShellRow icon={<MessageCircleMore size={ICON_SIZE} />} label="Chat" />
        <Box style={{ flex: "1 1 auto" }} />
        <ShellRow icon={<Bell size={ICON_SIZE} />} label="Oznámení" />
        <HelpMenu onReplay={onReplay} />
        <Group gap={10} wrap="nowrap" h={44} px={10}>
          <Box w={26} h={26} bg="cards.5" style={{ borderRadius: 9999 }} />
          <Text fz={14} fw={600} c="text.6">
            Jarda
          </Text>
        </Group>
      </Stack>
      <Box p={40} style={{ flex: "1 1 auto", minWidth: 0 }}>
        <Text c="var(--color-muted)">Klikni na Nápověda v sidebaru.</Text>
      </Box>
    </Group>
  );
}

function SectionTitle({ children }: { children: string }): ReactElement {
  return (
    <Text className="tabular-nums" fz={11} fw={400} tt="uppercase" lts="var(--tracking-label)" c="var(--color-text-dim)" px="md">
      {children}
    </Text>
  );
}

function SettingsRow({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <Group justify="space-between" px="md" py={10} wrap="nowrap">
      <Text c="text.6" fz={15} fw={600}>
        {label}
      </Text>
      <Text fz={13} c="var(--color-text-dim)">
        {value}
      </Text>
    </Group>
  );
}

function LearnPhone({ onReplay }: LearnProps): ReactElement {
  return (
    <Stack gap={0} mih="100dvh" bg="background.9" pt={64}>
      <SectionTitle>Obecné</SectionTitle>
      <Card className="m-3" px={0} py={10} radius="lg" style={CARD_STYLE}>
        <SettingsRow label="Jazyk" value="Čeština" />
        <SettingsRow label="Měna" value="CZK" />
      </Card>

      <SectionTitle>Učit se appku</SectionTitle>
      <Card className="m-3" px={0} py={10} radius="lg" style={CARD_STYLE}>
        <UnstyledButton onClick={onReplay} className="w-full" px="md" py={10}>
          <Group justify="space-between" wrap="nowrap">
            <Text c="text.6" fz={15} fw={600}>
              Spustit úvod znovu
            </Text>
            <ChevronRight size={18} color="var(--color-text-dim)" />
          </Group>
        </UnstyledButton>
        <Group justify="space-between" px="md" py={10} wrap="nowrap">
          <Text c="text.6" fz={15} fw={600}>
            Tipy na nových obrazovkách
          </Text>
          <TipsSwitch />
        </Group>
      </Card>

      <SectionTitle>O aplikaci</SectionTitle>
      <Card className="m-3" px={0} py={10} radius="lg" style={CARD_STYLE}>
        <SettingsRow label="Verze" value="1.0.0" />
      </Card>
    </Stack>
  );
}

export function LearnPrototype({ onReplay }: LearnProps): ReactElement {
  return useIsDesktop() ? <LearnDesktop onReplay={onReplay} /> : <LearnPhone onReplay={onReplay} />;
}
