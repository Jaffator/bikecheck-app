// Where an early user enters the key they were sent.
import { useState, type FormEvent, type ReactElement } from "react";
import { Button, Group, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { keyErrorLabel } from "../bikeLimit";
import { useRedeemKey } from "../useRedeemKey";

// What the API accepts (RedeemKeyDto).
const KEY_MAX_LENGTH = 100;

export function KeyForm(): ReactElement {
  const { t } = useTranslation();
  const redeem = useRedeemKey();
  const [code, setCode] = useState("");

  const trimmed = code.trim();

  function submit(event: FormEvent): void {
    event.preventDefault();
    if (trimmed === "" || redeem.isPending) return;
    redeem.mutate(trimmed);
  }

  return (
    <form onSubmit={submit}>
      <Stack gap="xs">
        <Text size="sm" c="text.6" style={{ lineHeight: 1.45 }}>
          {t("billing.keyPrompt")}
        </Text>
        <Group gap="xs" wrap="nowrap">
          <TextInput
            value={code}
            onChange={(event) => {
              setCode(event.currentTarget.value);
              redeem.reset();
            }}
            placeholder={t("billing.keyLabel")}
            aria-label={t("billing.keyLabel")}
            maxLength={KEY_MAX_LENGTH}
            error={redeem.isError}
            styles={inputStyles}
            flex={1}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            type="submit"
            color="primary.6"
            c={trimmed === "" ? undefined : "textDark.6"}
            radius="md"
            h="2.4rem"
            styles={disabledButtonStyles}
            loading={redeem.isPending}
            disabled={trimmed === ""}
            style={{ flexShrink: 0 }}
          >
            {t("billing.keyUnlock")}
          </Button>
        </Group>
        {redeem.isError && (
          <Text fz={13} c="red.5" role="alert">
            {t(keyErrorLabel(redeem.error))}
          </Text>
        )}
      </Stack>
    </form>
  );
}
