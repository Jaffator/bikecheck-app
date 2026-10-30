// A price typed straight into a grouped-list row, in the user's own currency.
import { useId, type ReactElement } from "react";
import { NumberInput, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ListRow } from "@/components/GroupedList";
import { LIST_SUB_ROW_HEIGHT, listRowInputStyles } from "@/components/groupedListStyles";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";

const PRICE_INPUT_STYLES = {
  ...listRowInputStyles,
  // The row dims as a whole when disabled; the input's own dimming would double it.
  input: { ...listRowInputStyles.input, fontVariantNumeric: "tabular-nums", opacity: 1 },
};

const COMPACT_PRICE_INPUT_STYLES = {
  ...PRICE_INPUT_STYLES,
  input: { ...PRICE_INPUT_STYLES.input, height: LIST_SUB_ROW_HEIGHT, minHeight: LIST_SUB_ROW_HEIGHT },
};

interface PriceRowProps {
  label: string;
  // What the field shows; an empty string is an empty field.
  value: number | string;
  onChange: (value: number | string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function PriceRow({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  compact,
}: PriceRowProps): ReactElement {
  const { i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const id = useId();

  return (
    <ListRow label={label} labelFor={id} disabled={disabled} compact={compact}>
      <NumberInput
        id={id}
        variant="unstyled"
        value={value}
        placeholder={placeholder}
        min={0}
        hideControls
        disabled={disabled}
        styles={compact === true ? COMPACT_PRICE_INPUT_STYLES : PRICE_INPUT_STYLES}
        onChange={onChange}
        onBlur={onBlur}
      />
      {/* Beside the field rather than inside it, so an emptied field stays empty. */}
      <Text fz={14} c="text.8" style={{ flexShrink: 0 }}>
        {currencySymbol(user?.currency ?? null, i18n.language)}
      </Text>
    </ListRow>
  );
}
