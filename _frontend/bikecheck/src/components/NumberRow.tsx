// A number typed straight into a grouped-list row; an emptied field is null, never zero.
import { useId, type ReactElement } from "react";
import { NumberInput, type NumberInputProps } from "@mantine/core";
import { ListRow } from "./GroupedList";
import { listRowFigureInputStyles } from "./groupedListStyles";

interface NumberRowProps extends Pick<NumberInputProps, "placeholder" | "min" | "max" | "step" | "decimalScale"> {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumberRow({ label, value, onChange, ...limits }: NumberRowProps): ReactElement {
  const id = useId();

  return (
    <ListRow label={label} labelFor={id}>
      <NumberInput
        id={id}
        variant="unstyled"
        hideControls
        value={value ?? ""}
        styles={listRowFigureInputStyles}
        onChange={(next) => onChange(next === "" ? null : Number(next))}
        {...limits}
      />
    </ListRow>
  );
}
