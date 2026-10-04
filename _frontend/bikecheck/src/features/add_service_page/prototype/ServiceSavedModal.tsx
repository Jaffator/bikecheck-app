// PROTOTYPE (proto/desktop-wizards): what follows Save - another Service, or out of the wizard.
import { type ReactElement } from "react";
import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import { COPY } from "./serviceCopy";
import type { SavedSummary } from "./useServiceDesktopPrototype";

interface ServiceSavedModalProps {
  opened: boolean;
  summary: SavedSummary | null;
  onAnother: () => void;
  // Also what closing the dialog means: the Service is saved, so the form behind it is spent.
  onDone: () => void;
}

export function ServiceSavedModal({ opened, summary, onAnother, onDone }: ServiceSavedModalProps): ReactElement {
  const { i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const currency = currencySymbol(user?.currency ?? null, i18n.language);

  return (
    <Modal
      opened={opened}
      onClose={onDone}
      centered
      withCloseButton={false}
      radius="lg"
      size={420}
      styles={{ content: { backgroundColor: "var(--mantine-color-cards-6)" } }}
    >
      <Stack gap={10} align="center" px="sm" pt="lg" pb="xs">
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 52,
            height: 52,
            borderRadius: "50%",
            backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 14%, transparent)",
            color: "var(--mantine-color-primary-6)",
          }}
        >
          <Check size={24} strokeWidth={2.5} />
        </Box>
        <Text component="h2" fw={700} fz={20} c="text.6" lts="var(--tracking-title)" m={0} mt={6}>
          {COPY.savedTitle}
        </Text>
        {summary !== null && (
          <Text fz={14} c="var(--color-text-dim)" ta="center" className="tabular-nums">
            {COPY.savedCount}: {summary.actionCount} · {COPY.savedTotal} {summary.totalCost} {currency}
          </Text>
        )}
        <Group gap={10} grow w="100%" mt="md">
          <Button variant="outline" radius="md" onClick={onAnother} style={{ height: "2.6rem" }}>
            {COPY.another}
          </Button>
          <Button color="primary.6" c="textDark.6" radius="md" onClick={onDone} style={{ height: "2.6rem" }}>
            {COPY.done}
          </Button>
        </Group>
        <Text fz={12} c="text.9" ta="center">
          {COPY.stub}
        </Text>
      </Stack>
    </Modal>
  );
}
