// Pro from a key: what the rider has, that it is free, and the way on to the bike.
import type { ReactElement, RefObject } from "react";
import { Group, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ProPrimaryButton } from "./ProButtons";
import { ProStepFrame } from "./ProStepFrame";

const ROWS = [
  { label: "billing.rowBikes", value: "billing.rowBikesValue" },
  { label: "billing.rowAi", value: "billing.rowAiValue" },
  { label: "billing.rowPrice", value: "billing.rowPriceValue" },
] as const;

interface KeyDoneStepProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  // The wizard is open underneath, so the way on is back to it.
  overWizard: boolean;
  onGoOn: () => void;
}

export function KeyDoneStep({ headingRef, overWizard, onGoOn }: KeyDoneStepProps): ReactElement {
  const { t } = useTranslation();

  return (
    <ProStepFrame
      actions={<ProPrimaryButton label={t(overWizard ? "billing.continue" : "billing.addBike")} onClick={onGoOn} />}
    >
      <Group gap={12} wrap="nowrap">
        <DoneCheck />
        <Title
          ref={headingRef}
          tabIndex={-1}
          className="pro-heading"
          order={2}
          fz={28}
          lh="36px"
          fw={700}
          lts="var(--tracking-display)"
          c="text.6"
        >
          {t("billing.unlockedTitle")}
        </Title>
      </Group>
      <dl className="pro-rows">
        {ROWS.map((row) => (
          <div key={row.label} className="pro-rows__row">
            <Text component="dt" fz="inherit" lh="20px" c="text.7">
              {t(row.label)}
            </Text>
            <Text component="dd" m={0} ta="right" fz="inherit" lh="20px" fw={500} c="text.6">
              {t(row.value)}
            </Text>
          </div>
        ))}
      </dl>
    </ProStepFrame>
  );
}

function DoneCheck(): ReactElement {
  return (
    <svg width={36} height={36} viewBox="0 0 64 64" aria-hidden style={{ flexShrink: 0 }}>
      <circle className="pro-check__disc" cx={32} cy={32} r={32} fill="var(--mantine-color-primary-6)" />
      <path
        className="pro-check__tick"
        pathLength={1}
        d="M20 33 28.5 41.5 45 24"
        fill="none"
        stroke="var(--mantine-color-textDark-6)"
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
