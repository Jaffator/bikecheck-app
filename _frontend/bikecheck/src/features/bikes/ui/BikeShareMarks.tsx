// What of a bike is out there, over its photo: its profile and its open Report links.
// No handlers, so a tap on a mark goes to the card under it.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2, type LucideIcon } from "lucide-react";
import type { Bike } from "@/features/bikes/bikes.types";
import { useMyProfile } from "@/features/profile/profile.queries";
import type { Profile, ProfileVisibility } from "@/features/profile/profile.types";
import { VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { useLiveReportCount } from "@/features/report/report.queries";

const COLOR = "var(--color-accent)";

interface MarkProps {
  icon: LucideIcon;
  label: string;
  count?: number;
}

function Mark({ icon: Icon, label, count }: MarkProps): ReactElement {
  return (
    <Group
      role="img"
      aria-label={label}
      title={label}
      gap={4}
      h={26}
      pl={8}
      pr={count === undefined ? 8 : 10}
      wrap="nowrap"
      style={{
        borderRadius: "9999px",
        backgroundColor: `color-mix(in srgb, ${COLOR} 13%, var(--mantine-color-cards-6))`,
      }}
    >
      <Icon size={12} color={COLOR} style={{ display: "block", flexShrink: 0 }} />
      {count !== undefined && (
        <Text className="tabular-nums" fz={12} fw={600} c={COLOR}>
          {count}
        </Text>
      )}
    </Group>
  );
}

// Archiving leaves the switch alone, yet an archived bike is off the profile whatever it says.
function sharedOn(bike: Bike, profile: Profile | undefined): ProfileVisibility | null {
  if (bike.is_deleted === true) return null;
  if (profile === undefined || profile.visibility === "OFF") return null;
  return profile.visibility;
}

export function BikeShareMarks({ bike }: { bike: Bike }): ReactElement | null {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const liveReports = useLiveReportCount(bike.id);
  const visibility = sharedOn(bike, profile);

  if (!bike.is_shared || (visibility === null && liveReports === 0)) return null;

  return (
    <Group gap={4} wrap="nowrap">
      {visibility !== null && <Mark icon={VISIBILITY_ICON[visibility]} label={t(VISIBILITY_LABEL_KEY[visibility])} />}
      {liveReports > 0 && (
        <Mark icon={Link2} label={t("report.liveLinks", { count: liveReports })} count={liveReports} />
      )}
    </Group>
  );
}
