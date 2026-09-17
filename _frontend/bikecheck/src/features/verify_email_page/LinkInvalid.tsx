// A link that verifies nothing - expired, forged, or minted for a placeholder since
// replaced (ADR 0031). One message for every reason, because the backend answers all of
// them with one code; the way back is sign in.
import type { ReactElement } from "react";
import { Button, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link2Off } from "lucide-react";

interface LinkInvalidProps {
  onBackToLogin: () => void;
}

export function LinkInvalid({ onBackToLogin }: LinkInvalidProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack align="center" gap="md" ta="center">
      <Link2Off size={40} color="var(--mantine-color-text-8)" />
      <Text fw={600} size="lg" c="text.1">
        {t("auth.linkInvalidTitle")}
      </Text>
      <Text size="sm" c="text.1">
        {t("auth.linkInvalidBody")}
      </Text>
      <Button radius="lg" style={{ height: "3rem" }} fullWidth mt="sm" onClick={onBackToLogin}>
        {t("auth.backToLogin")}
      </Button>
    </Stack>
  );
}
