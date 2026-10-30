// A field typed straight into a grouped-list row, right-aligned against its label.
import { useId, type CSSProperties, type ReactElement } from "react";
import { Text, TextInput } from "@mantine/core";
import { ListRow } from "./GroupedList";
import { listRowFigureInputStyles, listRowInputStyles } from "./groupedListStyles";

// An empty field that must be filled says so in its own placeholder.
const INVALID_INPUT_STYLES = {
  ...listRowInputStyles,
  input: { ...listRowInputStyles.input, "--input-placeholder-color": "var(--mantine-color-red-5)" } as CSSProperties,
};

interface TextRowProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  // A figure on the numeric keyboard, with its unit beside the field.
  numeric?: boolean;
  suffix?: string;
  invalid?: boolean;
}

export function TextRow({ label, value, onChange, placeholder, numeric, suffix, invalid }: TextRowProps): ReactElement {
  const id = useId();
  const styles = invalid === true ? INVALID_INPUT_STYLES : numeric === true ? listRowFigureInputStyles : listRowInputStyles;

  return (
    <ListRow label={label} labelFor={id}>
      <TextInput
        id={id}
        variant="unstyled"
        value={value}
        placeholder={placeholder}
        inputMode={numeric === true ? "numeric" : undefined}
        aria-invalid={invalid}
        styles={styles}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {/* Beside the field rather than inside it, so an emptied field stays empty. */}
      {suffix !== undefined && (
        <Text fz={14} c="text.8" style={{ flexShrink: 0 }}>
          {suffix}
        </Text>
      )}
    </ListRow>
  );
}
