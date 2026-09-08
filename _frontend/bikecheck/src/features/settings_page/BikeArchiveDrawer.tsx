// The archive: bikes taken out of use. They keep their whole history and count towards
// nothing, and this is the one place they are reached from - putting a bike back into use
// or destroying it for good are both offered here and nowhere else (ADR 0024).
import { useState, type ReactElement } from "react";
import { Button, Drawer, Group, Image, Loader, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useArchivedBikes, useDeleteBikePermanently, useUnarchiveBike } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Below the confirmations it raises, above the settings page it sits on. The same place
// the custom parts drawer takes, since only one of them is ever open.
const DRAWER_Z_INDEX = 320;

// How large the photo runs beside a name. A thumbnail, not a hero.
const THUMBNAIL = 56;

interface BikeArchiveDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function BikeArchiveDrawer({ opened, onClose }: BikeArchiveDrawerProps): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: bikes, isLoading } = useArchivedBikes(opened);
  const unarchive = useUnarchiveBike();
  const destroy = useDeleteBikePermanently();
  const [restoring, setRestoring] = useState<Bike | null>(null);
  // The bike whose destruction is being asked about, and the name typed back so far.
  const [destroying, setDestroying] = useState<Bike | null>(null);
  const [typedName, setTypedName] = useState("");
  const archived = bikes ?? [];

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  // The name has to match exactly, so a glance at the wrong row cannot destroy a bike.
  const nameMatches = destroying !== null && typedName === bikeTitle(destroying);

  function askToDestroy(bike: Bike): void {
    setTypedName("");
    setDestroying(bike);
  }

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        radius="lg"
        zIndex={DRAWER_Z_INDEX}
        title={t("archive.title")}
        overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
        styles={{
          content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto", maxHeight: "88dvh" },
          header: { backgroundColor: "var(--mantine-color-cards-6)" },
          body: { paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" color="primary.6" />
          </Group>
        ) : (
          <Stack gap="md">
            {/* Most owners never archive a bike, so the empty state is the common one. */}
            {archived.length === 0 ? (
              <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                {t("archive.empty")}
              </Text>
            ) : (
              archived.map((bike) => (
                <Stack key={bike.id} gap={8}>
                  {/* The row opens the bike's ordinary detail, which reads as a record. */}
                  <UnstyledButton
                    onClick={() => {
                      onClose();
                      navigate(`/bikes/${String(bike.id)}`);
                    }}
                  >
                    <Group gap="sm" wrap="nowrap">
                      {bike.image_url !== null && bike.image_url !== "" ? (
                        <Image
                          src={bike.image_url}
                          alt=""
                          w={THUMBNAIL}
                          h={THUMBNAIL}
                          radius="md"
                          fit="cover"
                          style={{ flexShrink: 0 }}
                        />
                      ) : (
                        <div
                          aria-hidden
                          style={{
                            width: THUMBNAIL,
                            height: THUMBNAIL,
                            flexShrink: 0,
                            borderRadius: "var(--mantine-radius-md)",
                            backgroundColor: "var(--mantine-color-cards-5)",
                          }}
                        />
                      )}
                      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                        <Text c="text.6" fw={500} truncate>
                          {bikeTitle(bike)}
                        </Text>
                        {bike.bikename !== null && bike.bikename !== "" && (
                          <Text fz={12} c="var(--color-text-dim)" className="font-mono" truncate>
                            {bike.bikename}
                          </Text>
                        )}
                      </Stack>
                      <ChevronRight size={18} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                    </Group>
                  </UnstyledButton>

                  <Group gap="sm" grow>
                    <Button variant="default" radius="md" size="xs" onClick={() => setRestoring(bike)}>
                      {t("archive.unarchive")}
                    </Button>
                    <Button variant="light" color="red.5" radius="md" size="xs" onClick={() => askToDestroy(bike)}>
                      {t("archive.deleteForever")}
                    </Button>
                  </Group>
                </Stack>
              ))
            )}

            {(unarchive.isError || destroy.isError) && (
              <Text fz={13} c="red.5">
                {t("archive.actionFailed")}
              </Text>
            )}
          </Stack>
        )}
      </Drawer>

      {/* Putting a bike back costs nothing but says what does not come back with it. */}
      <ConfirmModal
        opened={restoring !== null}
        onCancel={() => setRestoring(null)}
        onConfirm={() => {
          if (restoring === null) return;
          unarchive.mutate(restoring.id, { onSuccess: () => setRestoring(null) });
        }}
        title={t("archive.unarchiveConfirmTitle", { name: restoring === null ? "" : bikeTitle(restoring) })}
        body={t("archive.unarchiveConfirmBody")}
        cancelLabel={t("archive.cancel")}
        confirmLabel={t("archive.unarchive")}
        pending={unarchive.isPending}
      />

      {/* The irreversible one. The name is typed back here and never sent - the server
          already knows it; this guard is for the hand, not for the wire. */}
      <ConfirmModal
        opened={destroying !== null}
        onCancel={() => setDestroying(null)}
        onConfirm={() => {
          if (destroying === null || !nameMatches) return;
          destroy.mutate(destroying.id, { onSuccess: () => setDestroying(null) });
        }}
        title={t("archive.deleteConfirmTitle", { name: destroying === null ? "" : bikeTitle(destroying) })}
        body={t("archive.deleteConfirmBody")}
        cancelLabel={t("archive.cancel")}
        confirmLabel={t("archive.deleteForever")}
        pending={destroy.isPending}
        confirmDisabled={!nameMatches}
      >
        <TextInput
          value={typedName}
          onChange={(event) => setTypedName(event.currentTarget.value)}
          placeholder={destroying === null ? "" : bikeTitle(destroying)}
          label={t("archive.deleteConfirmTypeName")}
          autoCapitalize="none"
          autoCorrect="off"
        />
      </ConfirmModal>
    </>
  );
}
