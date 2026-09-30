// Plan, or the planned day once there is one - the date is also the control (ADR 0038).
// A frame and nothing else: the reading beside it is what the owner came for.
import type { ReactElement } from "react";
import { Box, Button } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { PASSED_PLAN_COLOR, isPlanPassed, planDayLabel } from "@/features/service_tracking/plannedDay";

interface PlanDayButtonProps {
  planned: string | null;
  onPlan: () => void;
  // A fixed width lines a column of days up; without one the frame hugs its label.
  width?: number;
}

export function PlanDayButton({ planned, onPlan, width }: PlanDayButtonProps): ReactElement {
  const { t, i18n } = useTranslation();

  return (
    <Box w={width} style={{ flexShrink: 0 }}>
      <Button
        fullWidth={width !== undefined}
        size="compact-xs"
        variant="subtle"
        color="gray"
        radius="sm"
        className="tabular-nums"
        fz={11}
        tt="uppercase"
        styles={{
          label: { letterSpacing: "var(--tracking-label)" },
          root: {
            color: frameColor(planned),
            border: "1px solid var(--mantine-color-inputs-5)",
            backgroundColor: "transparent",
          },
        }}
        onClick={(event) => {
          // The row around it opens the drawer; planning does not.
          event.stopPropagation();
          onPlan();
        }}
      >
        {planned === null ? t("tracking.plan") : planDayLabel(planned, i18n.language)}
      </Button>
    </Box>
  );
}

// A day is data, so it reads brighter than the bare control; a passed one warns.
function frameColor(planned: string | null): string {
  if (planned === null) return "var(--mantine-color-text-8)";
  return isPlanPassed(planned) ? PASSED_PLAN_COLOR : "var(--mantine-color-text-7)";
}
