// The small ✓ / ⚠ a ride wears once it has a check-in; nothing before.
import type { ReactElement } from "react";
import { Check, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CHECK_IN_COLOR } from "@/features/rides/checkIn";
import type { RideCheckIn } from "@/features/rides/rides.types";

interface CheckInMarkProps {
  checkIn: RideCheckIn | null;
  size?: number;
}

export function CheckInMark({ checkIn, size = 14 }: CheckInMarkProps): ReactElement | null {
  const { t } = useTranslation();
  if (checkIn === null) return null;

  const Icon = checkIn.status === "OK" ? Check : TriangleAlert;
  const label = t(checkIn.status === "OK" ? "checkIn.ok" : "checkIn.issue");
  return (
    <Icon
      size={size}
      strokeWidth={2.4}
      color={CHECK_IN_COLOR[checkIn.status]}
      aria-label={label}
      role="img"
      // Sits on the text baseline when drawn inline beside a date.
      style={{ flexShrink: 0, verticalAlign: "-0.125em" }}
    />
  );
}
