// A price typed straight into a grouped-list row, in the user's own currency.
import { useId, type ReactElement } from "react";
import { NumberInput, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ListRow } from "@/components/GroupedList";
import { listRowInputStyles } from "@/components/groupedListStyles";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";

const PRICE_INPUT_STYLES = {
  ...listRowInputStyles,
  input: { ...listRowInputStyles.input, fontVariantNumeric: "tabular-nums" },
};

interface PriceRowProps {
  label: string;
  // What the field shows; an empty string is an empty field.
  value: number | string;
  onChange: (value: number | string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PriceRow({ label, value, onChange, onBlur, placeholder, disabled }: PriceRowProps): ReactElement {
  const { i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const id = useId();

  return (
    <ListRow label={label} labelFor={id}>
      <NumberInput
        id={id}
        variant="unstyled"
        value={value}
        placeholder={placeholder}
        min={0}
        hideControls
        disabled={disabled}
        styles={PRICE_INPUT_STYLES}
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
