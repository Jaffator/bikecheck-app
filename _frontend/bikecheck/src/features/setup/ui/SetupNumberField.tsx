// One number on the Setup sheet, with its unit written after it. Empty is "not recorded":
// clearing the field hands back null, never zero.
import type { ReactElement } from "react";
import { NumberInput, Text } from "@mantine/core";
import { inputStyles } from "@/features/add_bike_page/formStyles";

interface SetupNumberFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  // Written after the number - "bar", "psi", "%". Absent for a plain count.
  unit?: string;
  // How many decimals the field accepts; zero makes it a whole number.
  decimals: number;
  max?: number;
  // An Archived Bike reads its sheet without being able to type into it.
  readOnly?: boolean;
}

export function SetupNumberField({
  label,
  value,
  onChange,
  unit,
  decimals,
  max,
  readOnly = false,
}: SetupNumberFieldProps): ReactElement {
  return (
    <NumberInput
      label={label}
      styles={inputStyles}
      value={value ?? ""}
      min={0}
      max={max}
      decimalScale={decimals}
      allowDecimal={decimals > 0}
      allowNegative={false}
      hideControls
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      readOnly={readOnly}
      rightSection={
        unit === undefined ? undefined : (
          <Text fz={13} c="var(--color-text-dim)">
            {unit}
          </Text>
        )
      }
      rightSectionWidth={unit === undefined ? undefined : 44}
      rightSectionPointerEvents="none"
      onChange={(next) => onChange(next === "" ? null : Number(next))}
    />
  );
}
