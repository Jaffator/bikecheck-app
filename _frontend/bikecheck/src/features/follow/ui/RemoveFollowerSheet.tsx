// The one confirmation behind Odebrat. Stays mounted and keeps the last person, so the exit
// slide still has a face to carry down (docs/conventions/drawers.md).
import type { CSSProperties, ReactElement } from "react";
import { Button, Drawer, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SheetGrabber } from "@/components/SheetGrabber";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { useRemoveFollower } from "../follow.queries";
import type { FollowerRow } from "../follow.types";
import { personName } from "../personName";
import { PersonAvatar } from "./PersonRow";

// The same layer the other bottom sheets take; only one of them is ever open.
const SHEET_Z_INDEX = 300;

const AVATAR_SIZE = 64;

interface RemoveFollowerSheetProps {
  // The last person asked about, kept while the sheet slides away; null before the first ask.
  person: FollowerRow | null;
  opened: boolean;
  onClose: () => void;
}

export function RemoveFollowerSheet({ person, opened, onClose }: RemoveFollowerSheetProps): ReactElement {
  const { t } = useTranslation();
  const remove = useRemoveFollower();

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  function confirm(): void {
    if (person === null) return;
    remove.mutate(person, { onSettled: onClose });
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto" },
        body: { paddingBottom: "calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
      }}
    >
      <SheetGrabber onClose={onClose} />

      {person !== null && (
        <Stack align="center" gap="md" pt="sm">
          <PersonAvatar person={person} size={AVATAR_SIZE} />
          <Stack gap={4} align="center">
            <Text fw={700} fz={18} c="text.6">
              {t("follow.removeTitle")}
            </Text>
            <Text fz={14} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
              {personName(person, t("follow.unnamed"))}
              {person.handle !== null && ` · @${person.handle}`}
              <br />
              {t("follow.removeBody")}
            </Text>
          </Stack>
          <Stack gap="sm" w="100%" pt="xs">
            <Button
              color="red.5"
              radius="md"
              fullWidth
              styles={{ root: { "--button-color": "black" } as CSSProperties }}
              loading={remove.isPending}
              onClick={confirm}
            >
              {t("follow.removeConfirm")}
            </Button>
            <Button variant="subtle" color="text.6" radius="md" fullWidth onClick={onClose}>
              {t("follow.back")}
            </Button>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
