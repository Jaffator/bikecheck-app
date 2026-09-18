// PROTOTYPE #121 — the share drawer (round 1's "Ovládací panel"): one segmented control on
// top decides the state; under it a settings form that is genuinely disabled when OFF.
// Three variants of the same form: plain rows split by hairlines (1), each section in a
// panel card (2), or the same cards on a darker sheet body, the way Settings cards sit on
// the page (3).
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { Box, Drawer, Group, Image, SegmentedControl, Stack, Switch, Text, TextInput } from "@mantine/core";
import { Share2 } from "lucide-react";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { handleError, profileHost } from "./handle";
import {
  usePrototypeStore,
  VISIBILITY_HINT,
  VISIBILITY_LABEL,
  type SectionKey,
  type Variant,
  type Visibility,
} from "./prototype.store";
import { LinkActions } from "./LinkActions";
import { DRAWER_PROPS, EYEBROW, PANEL, useProfileBikes } from "./shared";

const THUMB = 40;
const HAIRLINE = "1px solid var(--color-border-subtle)";

// Disabled sinks into the sheet the way the theme's disabled Button does.
function switchStyles(checked: boolean, disabled: boolean) {
  if (disabled) {
    return {
      track: {
        backgroundColor: "var(--mantine-color-cards-7)",
        borderColor: "var(--mantine-color-inputs-5)",
        cursor: "not-allowed",
      },
      thumb: { backgroundColor: "var(--mantine-color-text-9)" },
    };
  }
  return {
    track: {
      backgroundColor: checked ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
      borderColor: "var(--mantine-color-other-borderSolid)",
    },
    thumb: { backgroundColor: checked ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)" },
  };
}

const HANDLE_INPUT_STYLES = {
  ...inputStyles,
  input: {
    ...inputStyles.input,
    fontFamily: "var(--font-mono)",
    paddingLeft: 36,
    "--input-disabled-bg": "var(--mantine-color-cards-7)",
    "--input-disabled-color": "var(--mantine-color-text-9)",
  } as CSSProperties,
};

interface SectionProps {
  title: string;
  cards: boolean;
  children: ReactNode;
}

// Variant 1: eyebrow over rows on the sheet. Variant 2: eyebrow and rows inside a panel.
function Section({ title, cards, children }: SectionProps): ReactElement {
  if (cards) {
    return (
      <Box px="md" pt="sm" pb={4} style={PANEL}>
        <Text {...EYEBROW}>{title}</Text>
        {children}
      </Box>
    );
  }
  // A hairline and a breath above each eyebrow: the sections read as sections without a
  // surface of their own.
  return (
    <Stack gap={0} pt="md" style={{ borderTop: HAIRLINE }}>
      <Text {...EYEBROW}>{title}</Text>
      {children}
    </Stack>
  );
}

interface RowProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
  nested?: boolean;
  first?: boolean;
  leading?: ReactNode;
}

function Row({
  label,
  hint,
  checked,
  onChange,
  disabled,
  nested = false,
  first = false,
  leading,
}: RowProps): ReactElement {
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      py={10}
      pl={nested ? 20 : 0}
      style={{ borderTop: first ? "none" : HAIRLINE }}
    >
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        {leading}
        <Stack gap={1} style={{ minWidth: 0 }}>
          <Text fw={600} fz={15} c={disabled ? "text.9" : "text.6"} truncate>
            {label}
          </Text>
          {hint && (
            <Text fz={12} c={disabled ? "text.9" : "var(--color-text-dim)"}>
              {hint}
            </Text>
          )}
        </Stack>
      </Group>
      <Switch
        withThumbIndicator={false}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        styles={switchStyles(checked, disabled)}
      />
    </Group>
  );
}

interface ShareDrawerProps {
  variant: Variant;
}

export function ShareDrawer({ variant }: ShareDrawerProps): ReactElement {
  const cards = variant !== "1";
  const dark = variant === "3";
  const opened = usePrototypeStore((state) => state.drawerOpened);
  const close = usePrototypeStore((state) => state.closeDrawer);
  const visibility = usePrototypeStore((state) => state.visibility);
  const setVisibility = usePrototypeStore((state) => state.setVisibility);
  const handle = usePrototypeStore((state) => state.handle);
  const setHandle = usePrototypeStore((state) => state.setHandle);
  const sections = usePrototypeStore((state) => state.sections);
  const toggleSection = usePrototypeStore((state) => state.toggleSection);
  const toggleBike = usePrototypeStore((state) => state.toggleBike);
  const bikes = useProfileBikes();
  const error = handleError(handle);
  const off = visibility === "OFF";

  useOverlayBack(opened, close);

  const rows: { key: SectionKey; label: string; hint: string }[] = [
    { key: "components", label: "Komponenty", hint: "Osazení kola po typech dílů" },
    { key: "setup", label: "Setup", hint: "Tlaky, odpružení, profily" },
    { key: "history", label: "Servisní historie", hint: "Datum a úkony, bez poznámek a příloh" },
  ];

  return (
    <Drawer
      opened={opened}
      onClose={close}
      title={
        <Group gap={8} wrap="nowrap">
          <Share2 size={18} color="var(--mantine-color-text-6)" />
          <span>Sdílení profilu</span>
        </Group>
      }
      // The grabber line rides on Mantine's own header, so the close button stays the stock one.
      classNames={{
        header:
          "relative pt-9 before:content-[''] before:absolute before:top-2 before:left-1/2 before:-translate-x-1/2 before:w-9 before:h-1 before:rounded-full before:bg-[var(--color-border-subtle)]",
      }}
      {...DRAWER_PROPS}
      // Cards run closer to the sheet's edges than plain rows do. The dark sheet keeps its
      // header on the card colour; only the ground under the cards drops a step.
      styles={{
        ...DRAWER_PROPS.styles,
        content: {
          ...DRAWER_PROPS.styles.content,
          backgroundColor: dark ? "var(--mantine-color-background-8)" : "var(--mantine-color-cards-6)",
        },
        body: { ...DRAWER_PROPS.styles.body, paddingInline: cards ? 8 : undefined },
      }}
    >
      <Stack gap={cards ? "lg" : "xl"}>
        <Stack gap={8}>
          {/* The one control that decides everything wears the accent, like a switch that is on.
              The theme paints every label dim, so the active one is forced dark by class. */}
          <SegmentedControl
            fullWidth
            withItemsBorders={false}
            color="primary.6"
            value={visibility}
            onChange={(value) => setVisibility(value as Visibility)}
            data={(["OFF", "FOLLOWERS", "PUBLIC"] as Visibility[]).map((value) => ({
              value,
              label: VISIBILITY_LABEL[value],
            }))}
            classNames={{ label: "data-[active]:!text-black data-[active]:font-semibold" }}
            styles={{ indicator: { backgroundColor: "var(--mantine-color-primary-6)" } }}
          />
          <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {VISIBILITY_HINT[visibility]}
          </Text>
        </Stack>

        <Section title="Adresa" cards={cards}>
          <Stack gap={8} pt={8} pb={cards ? 8 : 0}>
            <TextInput
              value={handle}
              disabled={off}
              onChange={(event) => setHandle(event.currentTarget.value.toLowerCase())}
              leftSection={
                <Text className="font-mono" fz={13} c={off ? "text.9" : "var(--color-text-dim)"} pl={4}>
                  /u/
                </Text>
              }
              leftSectionWidth={36}
              error={off ? null : error}
              styles={HANDLE_INPUT_STYLES}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <Text className="font-mono" fz={12} c={off ? "text.9" : "var(--color-text-dim)"} truncate>
              {profileHost()}/u/{handle}
            </Text>
            <LinkActions handle={handle} enabled={visibility === "PUBLIC" && error === null} withOpen />
            {visibility === "FOLLOWERS" && (
              <Text fz={12} c="var(--color-text-dim)">
                Odkaz funguje jen u veřejného profilu. Sledující tě najdou v appce podle adresy.
              </Text>
            )}
          </Stack>
        </Section>

        <Section title="Co sdílet" cards={cards}>
          {rows.map((row, index) => (
            <Row
              key={row.key}
              first={index === 0}
              label={row.label}
              hint={row.hint}
              checked={sections[row.key]}
              disabled={off}
              onChange={() => toggleSection(row.key)}
            />
          ))}
          {sections.history && (
            <Row
              nested
              label="Ceny servisů"
              hint="Cena za servis, měsíční součty i útrata"
              checked={sections.costs}
              disabled={off}
              onChange={() => toggleSection("costs")}
            />
          )}
        </Section>

        <Section title="Kola" cards={cards}>
          {bikes.map(({ bike, shared }, index) => (
            <Row
              key={bike.id}
              first={index === 0}
              label={bikeTitle(bike)}
              checked={shared}
              disabled={off}
              onChange={() => toggleBike(bike.id)}
              leading={
                bike.image_url ? (
                  <Image
                    src={bike.image_url}
                    alt=""
                    w={THUMB}
                    h={THUMB}
                    radius="sm"
                    fit="cover"
                    style={{ flexShrink: 0, opacity: shared && !off ? 1 : 0.4 }}
                  />
                ) : (
                  <Box
                    w={THUMB}
                    h={THUMB}
                    style={{ borderRadius: 6, backgroundColor: "var(--mantine-color-cards-5)", flexShrink: 0 }}
                  />
                )
              }
            />
          ))}
          {bikes.length === 0 && (
            <Text py={8} fz={13} c="var(--color-text-dim)">
              Zatím žádné kolo.
            </Text>
          )}
        </Section>
      </Stack>
    </Drawer>
  );
}
