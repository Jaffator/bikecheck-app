// The archive: bikes taken out of use. They keep their whole history and count towards
// nothing, and this is the one place they are reached from - putting a bike back into use
// or destroying it for good are both offered here and nowhere else (ADR 0024).
import { useState, type ReactElement } from "react";
import { Button, Group, Image, Loader, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { useArchivedBikes } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { ArchivedBikeConfirms } from "./ArchivedBikeConfirms";

// Below the confirmations it raises, above the garage it sits on. The same place the
// custom parts drawer takes, since only one of them is ever open.
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
  const [restoring, setRestoring] = useState<Bike | null>(null);
  const [destroying, setDestroying] = useState<Bike | null>(null);
  const archived = bikes ?? [];

  return (
    <>
      <ResponsiveSheet
        opened={opened}
        onClose={onClose}
        desktop="modal"
        zIndex={DRAWER_Z_INDEX}
        title={t("archive.title")}
        styles={{
          content: { height: "auto", maxHeight: "88dvh" },
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
                          <Text fz={12} c="var(--color-text-dim)" className="tabular-nums" truncate>
                            {bike.bikename}
                          </Text>
                        )}
                      </Stack>
                      <ChevronRight size={18} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                    </Group>
                  </UnstyledButton>

                  <Group gap="sm" grow>
                    <Button variant="outline" radius="md" size="xs" onClick={() => setRestoring(bike)}>
                      {t("archive.unarchive")}
                    </Button>
                    <Button
                      variant="filled"
                      color="red.5"
                      radius="md"
                      size="xs"
                      styles={{ root: { "--button-color": "black" } as React.CSSProperties }}
                      onClick={() => setDestroying(bike)}
                    >
                      {t("archive.deleteForever")}
                    </Button>
                  </Group>
                </Stack>
              ))
            )}
          </Stack>
        )}
      </ResponsiveSheet>

      <ArchivedBikeConfirms
        restoring={restoring}
        onRestoreClose={() => setRestoring(null)}
        destroying={destroying}
        onDestroyClose={() => setDestroying(null)}
      />
    </>
  );
}
