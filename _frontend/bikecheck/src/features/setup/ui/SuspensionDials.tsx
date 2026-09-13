// The dampers of one suspension section - fork or shock - drawn as the knobs on the bike: a
// rebound dial over a compression dial, each ring with its readouts and plus and minus beside it.
// A switch by each heading says whether the damper has one adjuster or a high-speed one too;
// that is a property of the part, written to it and shared by every profile. Clicks are
// counted from fully closed and stop at the ring's last click (ADR 0029).
import { useState, type CSSProperties, type ReactElement } from "react";
import { ActionIcon, Box, Group, SegmentedControl, Stack, Text } from "@mantine/core";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ExplanationModal } from "@/components/ExplanationModal";
import { fieldLabel } from "@/features/add_bike_page/formStyles";
import type { DialKind, RingValue } from "../dial.types";
import { DIAL_RANGE, type MountedSuspension } from "../dialBrand";
import type { Adjuster, SuspensionClicks } from "../setupForm";
import { ClickStepper } from "./ClickStepper";
import { GAUGE_GRID_SPACING, STEP_PAIR_WIDTH } from "./gaugeMetrics";
import { CompressionDial } from "./CompressionDial";
import { CompressionDialSimple } from "./CompressionDialSimple";
import { ForkReboundDial } from "./ForkReboundDial";
import { ForkReboundDialSimple } from "./ForkReboundDialSimple";
import { CaneCreekReboundDial } from "./ShockReboundDial";
import { ShockReboundDialSimple } from "./ShockReboundDialSimple";

// Each adjuster's full name, spoken for the ring and its buttons.
const RING_NAMES: Record<Adjuster, string> = {
  hsr: "setup.hsr",
  lsr: "setup.lsr",
  hsc: "setup.hsc",
  lsc: "setup.lsc",
};

// The knob takes a fixed share of the row; the readouts beside it take the rest.
const DIAL_WIDTH = 140;
const DIAL_GAP = "md";
// The readouts end where the right column's plus ends above them: the card's right column is
// half the card less half the grid gap, and the plus stands half a pair in from its middle.
// A percentage in a flex item's padding is taken of the row, which is the card, so 100% is it.
const COLUMN_WIDTH = `(100% - var(--mantine-spacing-${GAUGE_GRID_SPACING})) / 2`;
const READOUTS_INSET = `calc(${COLUMN_WIDTH} / 2 - ${STEP_PAIR_WIDTH / 2}px)`;
// The info mark after the "clicks" heading.
const INFO_SIZE = 18;
const INFO_GAP = 2;

// A read-only dial is not something to grab.
const READ_ONLY_STYLE: CSSProperties = { cursor: "default" };
// The dual shock dial has no readOnly of its own, so it is simply not touchable.
const READ_ONLY_SHOCK_STYLE: CSSProperties = { ...READ_ONLY_STYLE, pointerEvents: "none" };

interface SuspensionDialsProps {
  section: "fork" | "shock";
  // The mounted part; null when none is, and the generic single knobs stand in.
  part: MountedSuspension | null;
  clicks: SuspensionClicks;
  onChange: (ring: Adjuster, value: number) => void;
  onDualChange: (kind: DialKind, dual: boolean) => void;
  readOnly?: boolean;
}

export function SuspensionDials({
  section,
  part,
  clicks,
  onChange,
  onDualChange,
  readOnly = false,
}: SuspensionDialsProps): ReactElement {
  const { t } = useTranslation();
  const dialStyle = readOnly ? READ_ONLY_STYLE : undefined;
  const brand = part?.brand ?? "generic";
  const dualRebound = part?.dualRebound ?? false;
  const dualCompression = part?.dualCompression ?? false;
  // Without a mounted part there is no row for the switch to write to.
  const switchDisabled = readOnly || part === null;
  const layoutOptions = [
    { value: "single", label: t("setup.single") },
    { value: "dual", label: t("setup.dual") },
  ];
  // Which heading's info is open - how the clicks are counted - or null while none is.
  const [explained, setExplained] = useState<string | null>(null);

  // A ring as its dial takes it: not recorded draws as fully closed until the owner turns it.
  function ring(key: Adjuster): RingValue {
    const value = clicks[key] ?? 0;
    return {
      value,
      max: DIAL_RANGE,
      onChange: (next) => onChange(key, next),
      ariaLabel: t(RING_NAMES[key]),
      ariaValueText: t("setup.clicks", { count: value }),
    };
  }

  function stepper(key: Adjuster): ReactElement {
    return (
      <ClickStepper
        code={key.toUpperCase()}
        name={t(RING_NAMES[key])}
        value={clicks[key]}
        onChange={(next) => onChange(key, next)}
        max={DIAL_RANGE}
        readOnly={readOnly}
      />
    );
  }

  // One adjuster pair: its heading and the single/dual switch across the top, then the knob
  // beside its readouts. Single shows only the low-speed row; the high-speed value is kept.
  function row(title: string, kind: DialKind, dual: boolean, dial: ReactElement, keys: [Adjuster, Adjuster]): ReactElement {
    const shown: Adjuster[] = dual ? keys : [keys[1]];
    return (
      <Stack gap="xs">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Text style={fieldLabel}>{title}</Text>
          <SegmentedControl
            size="xs"
            data={layoutOptions}
            value={dual ? "dual" : "single"}
            onChange={(value) => onDualChange(kind, value === "dual")}
            disabled={switchDisabled}
            aria-label={t("setup.adjusterLayout", { dial: title })}
          />
        </Group>
        <Group gap={DIAL_GAP} wrap="nowrap" align="center">
          <Box w={DIAL_WIDTH} style={{ flexShrink: 0 }}>
            {dial}
          </Box>
          <Stack gap="sm" style={{ flex: 1, minWidth: 0, paddingRight: READOUTS_INSET }}>
            {/* Names the counts: the word and its mark centred as one over the figure between
                the plus and the minus, with how they are counted a tap away rather than printed
                under every knob. */}
            <Group gap={INFO_GAP} wrap="nowrap" align="center" justify="center" ml="auto" w={STEP_PAIR_WIDTH} mb={-1}>
              <Text fz={11} c="var(--color-text-dim)" lh={1}>
                {t("setup.clicksHeading")}
              </Text>
              <ActionIcon
                variant="transparent"
                color="gray"
                size={INFO_SIZE}
                aria-label={t("setup.clicksInfo", { dial: title })}
                onClick={() => setExplained(title)}
                style={{ flexShrink: 0 }}
              >
                <Info size={13} color="var(--color-text-dim)" />
              </ActionIcon>
            </Group>
            {shown.map((key) => (
              <Box key={key}>{stepper(key)}</Box>
            ))}
          </Stack>
        </Group>
      </Stack>
    );
  }

  const reboundDial = dualRebound ? (
    section === "fork" ? (
      <ForkReboundDial
        hsr={ring("hsr")}
        lsr={ring("lsr")}
        ariaLabel={t("setup.reboundDial")}
        readOnly={readOnly}
        style={dialStyle}
      />
    ) : (
      <CaneCreekReboundDial hsr={ring("hsr")} lsr={ring("lsr")} style={readOnly ? READ_ONLY_SHOCK_STYLE : undefined} />
    )
  ) : section === "fork" ? (
    <ForkReboundDialSimple lsr={ring("lsr")} ariaLabel={t("setup.reboundDial")} readOnly={readOnly} style={dialStyle} />
  ) : (
    <ShockReboundDialSimple lsr={ring("lsr")} ariaLabel={t("setup.reboundDial")} readOnly={readOnly} style={dialStyle} />
  );

  const compressionDial = dualCompression ? (
    <CompressionDial
      brand={brand}
      hsc={ring("hsc")}
      lsc={ring("lsc")}
      ariaLabel={t("setup.compressionDial")}
      readOnly={readOnly}
      style={dialStyle}
    />
  ) : (
    <CompressionDialSimple lsc={ring("lsc")} ariaLabel={t("setup.compressionDial")} readOnly={readOnly} style={dialStyle} />
  );

  return (
    // Extra room above the dials, so the token bar does not crowd the rebound knob.
    <Stack gap="lg" mt={30}>
      {row(t("setup.rebound"), "rebound", dualRebound, reboundDial, ["hsr", "lsr"])}
      {row(t("setup.compression"), "compression", dualCompression, compressionDial, ["hsc", "lsc"])}
      <ExplanationModal
        explained={explained === null ? null : { title: explained, body: t("setup.clicksFromClosed") }}
        onClose={() => setExplained(null)}
      />
    </Stack>
  );
}
