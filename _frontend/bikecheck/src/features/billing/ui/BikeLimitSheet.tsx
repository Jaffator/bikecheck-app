// Why another bike cannot be added. Mounted once for the whole app; every gate opens this one.
import { useEffect, type ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOpeningCount } from "@/hooks/useOpeningCount";
import { useBikeLimitStore } from "@/store/store";
import { useBikeLimit } from "../billing.queries";
import { KeyForm } from "./KeyForm";

// Above the wizard's summary, which stays under it when the server refuses on save.
const SHEET_Z_INDEX = 400;

const FREE_BIKE_LIMIT = 1;

export function BikeLimitSheet(): ReactElement {
  const { t } = useTranslation();
  const opened = useBikeLimitStore((state) => state.opened);
  const hide = useBikeLimitStore((state) => state.hide);
  const { data: limit } = useBikeLimit();
  const keyboardOffset = useKeyboardOffset();
  const canUseKey = limit?.pro_since === null;
  // Mounted after whatever it opens over, so one Esc does not close the summary with it.
  const opening = useOpeningCount(opened);

  // Signing out unmounts it; the next rider must not meet it open.
  useEffect(() => hide, [hide]);

  return (
    <ResponsiveSheet
      key={opening}
      opened={opened}
      onClose={hide}
      desktop="modal"
      zIndex={SHEET_Z_INDEX}
      title={t("billing.limitTitle", { count: limit?.bike_limit ?? FREE_BIKE_LIMIT })}
      styles={{
        content: {
          height: "auto",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
          maxHeight: `calc(88dvh - ${String(keyboardOffset)}px)`,
        },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)", fontVariantNumeric: "tabular-nums" },
      }}
    >
      <Stack gap="sm">
        <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {t("billing.limitBody")}
        </Text>
        {limit?.has_archived_bikes && (
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("billing.limitArchived")}
          </Text>
        )}
        {canUseKey && <KeyForm />}
      </Stack>
    </ResponsiveSheet>
  );
}
