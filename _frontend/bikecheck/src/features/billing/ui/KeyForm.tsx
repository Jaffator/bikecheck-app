import type { FormEvent, ReactElement } from "react";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { useKeyForm } from "../useKeyForm";

// What the API accepts (RedeemKeyDto).
const KEY_MAX_LENGTH = 100;

export function KeyForm(): ReactElement {
  const { t } = useTranslation();
  const { code, setCode, canSubmit, isPending, failure, submit } = useKeyForm();

  function onSubmit(event: FormEvent): void {
    event.preventDefault();
    submit();
  }

  return (
    <form onSubmit={onSubmit}>
      <Stack gap="xs">
        <Text size="sm" c="text.6" style={{ lineHeight: 1.45 }}>
          {t("billing.keyPrompt")}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            placeholder={t("billing.keyLabel")}
            aria-label={t("billing.keyLabel")}
            maxLength={KEY_MAX_LENGTH}
            error={failure !== null}
            styles={inputStyles}
            flex={1}
            // Typing while it is sent would reset the request under way.
            readOnly={isPending}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            color="primary.6"
            c={canSubmit ? "textDark.6" : undefined}
            radius="md"
            h={inputStyles.input.height}
            styles={disabledButtonStyles}
            loading={isPending}
            disabled={!canSubmit}
            style={{ flexShrink: 0 }}
          >
            {t("billing.keyUnlock")}
          </Button>
        </Group>
        {failure !== null && (
          <Text fz={13} c="red.5" role="alert">
            {t(failure)}
          </Text>
        )}
      </Stack>
    </form>
  );
}
