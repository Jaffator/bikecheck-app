// The back of the card: the key, and under it why it was refused.
import { useId, type ReactElement, type RefObject } from "react";
import { Text } from "@mantine/core";
import { useTranslation } from "react-i18next";

// What the API accepts (RedeemKeyDto).
const KEY_MAX_LENGTH = 100;

interface KeyFieldProps {
  fieldRef: RefObject<HTMLInputElement | null>;
  code: string;
  onChange: (code: string) => void;
  isChecking: boolean;
  // A translation key; null while nothing was refused.
  failure: string | null;
}

export function KeyField({ fieldRef, code, onChange, isChecking, failure }: KeyFieldProps): ReactElement {
  const { t } = useTranslation();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <>
      <Text component="label" htmlFor={id} className="pro-card__name" fz={16} lh="20px" fw={600} c="text.6">
        {t("billing.keyLabel")}
      </Text>
      <div className="pro-key">
        <div style={{ position: "relative" }}>
          <input
            id={id}
            ref={fieldRef}
            className="pro-key__input"
            value={code}
            onChange={(event) => onChange(event.currentTarget.value)}
            placeholder={t("billing.keyPlaceholder")}
            maxLength={KEY_MAX_LENGTH}
            aria-invalid={failure !== null}
            aria-describedby={errorId}
            // Typing while it is sent would reset the request under way.
            readOnly={isChecking}
            enterKeyHint="go"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {isChecking && <div className="pro-key__run" aria-hidden />}
        </div>
        <Text id={errorId} className="pro-key__error" role="alert" fz={13} lh="18px" c="red.4">
          {failure !== null && t(failure)}
        </Text>
      </div>
    </>
  );
}
