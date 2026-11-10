// Asked before a profile goes Public, so nothing reaches anyone until the owner has chosen.
import { useState, type ReactElement } from "react";
import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { Bike } from "@/features/bikes/bikes.types";
import { useOpeningCount } from "@/hooks/useOpeningCount";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { ShareBikeRow } from "./ShareBikeRow";

// Above the share drawer it opens from.
const MODAL_Z_INDEX = 400;

interface BikeChoiceProps {
  bikes: Bike[];
  // Each bike's Shared Bike switch as it stands, by bike id.
  shared: Record<number, boolean>;
  onCancel: () => void;
  onConfirm: (chosen: Record<number, boolean>) => void;
}

interface PublicBikesModalProps extends BikeChoiceProps {
  opened: boolean;
}

export function PublicBikesModal({ opened, ...choice }: PublicBikesModalProps): ReactElement {
  const { t } = useTranslation();
  // A cancelled choice leaves nothing behind: each opening starts from what is saved.
  const opening = useOpeningCount(opened);

  // Android's back gesture dismisses this rather than the drawer under it.
  useOverlayBack(opened, choice.onCancel);

  return (
    <Modal
      opened={opened}
      onClose={choice.onCancel}
      title={t("sharing.pickBikesTitle")}
      centered
      radius="md"
      zIndex={MODAL_Z_INDEX}
      withCloseButton={false}
    >
      <BikeChoice key={opening} {...choice} />
    </Modal>
  );
}

function BikeChoice({ bikes, shared, onCancel, onConfirm }: BikeChoiceProps): ReactElement {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(shared);

  return (
    <Stack gap="md">
      <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
        {t("sharing.pickBikesBody")}
      </Text>

      <Box>
        {bikes.map((bike, index) => (
          <ShareBikeRow
            key={bike.id}
            bike={bike}
            first={index === 0}
            checked={chosen[bike.id]}
            onChange={(checked) => setChosen((current) => ({ ...current, [bike.id]: checked }))}
          />
        ))}
      </Box>

      <Group gap="sm" grow>
        <Button variant="outline" radius="md" onClick={onCancel}>
          {t("sharing.pickBikesCancel")}
        </Button>
        <Button color="primary.6" c="textDark.6" radius="md" onClick={() => onConfirm(chosen)}>
          {t("sharing.pickBikesConfirm")}
        </Button>
      </Group>
    </Stack>
  );
}
