// Desktop Přiřazené filter: every bike or one, in its colour, and one month or every ride.
import type { ReactElement } from "react";
import { Group, Select, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { useRideMonths } from "@/features/rides/rides.queries";
import { ALL_MONTHS, monthLabel, monthOptions } from "@/features/rides/ridesTable";
import { useRideTableParams } from "@/features/rides/useRideTableParams";

export function RideFilterBar(): ReactElement {
  const { t, i18n } = useTranslation();
  const { bikeId, month, setBike, setMonth } = useRideTableParams();
  const { data: bikes } = useBikes();
  const { data: months } = useRideMonths();

  const options = [
    ...monthOptions(months ?? [], month).map((value) => ({
      value,
      label: monthLabel(value, i18n.language),
    })),
    { value: ALL_MONTHS, label: t("ridesTable.allMonths") },
  ];

  return (
    <Group gap={8} wrap="wrap" justify="flex-end">
      <FilterChip label={t("ridesTable.allBikes")} active={bikeId === null} onClick={() => setBike(null)} />
      {(bikes ?? []).map((bike) => (
        <FilterChip
          key={bike.id}
          label={bikeTitle(bike)}
          colorIndex={bike.color_index}
          active={bikeId === bike.id}
          onClick={() => setBike(bike.id)}
        />
      ))}
      <Select
        size="xs"
        radius="md"
        w={150}
        data={options}
        value={month}
        allowDeselect={false}
        aria-label={t("ridesTable.month")}
        onChange={(value) => {
          if (value !== null) setMonth(value);
        }}
      />
    </Group>
  );
}

interface FilterChipProps {
  label: string;
  colorIndex?: number;
  active: boolean;
  onClick: () => void;
}

// Single choice, so the chosen chip wears the accent and the rest stay quiet.
function FilterChip({ label, colorIndex, active, onClick }: FilterChipProps): ReactElement {
  return (
    <UnstyledButton
      onClick={onClick}
      aria-pressed={active}
      className="hover-veil"
      h={30}
      px={12}
      fz={12}
      fw={active ? 700 : 600}
      c={active ? "primary.6" : "text.6"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        borderRadius: 9999,
        whiteSpace: "nowrap",
        border: `1px solid ${active ? "var(--mantine-color-primary-6)" : "var(--color-border-subtle)"}`,
        backgroundColor: active ? "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)" : undefined,
      }}
    >
      {colorIndex !== undefined && <BikeColorDot colorIndex={colorIndex} size={7} />}
      {label}
    </UnstyledButton>
  );
}
