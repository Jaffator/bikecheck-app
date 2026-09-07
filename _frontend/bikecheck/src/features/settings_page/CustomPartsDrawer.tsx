// The owner's own catalogue: the kinds of part they named that the app does not carry, and
// the only place one can be taken back out. Seeded parts are not listed — nothing can be
// done to them here, so a list of thirty of them would be scenery around the four rows that
// act (ADR 0021).
import { useState, type ReactElement } from "react";
import { ActionIcon, Drawer, Group, Loader, Stack, Text } from "@mantine/core";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useCustomComponentTypes, useDeleteComponentType } from "@/features/components/components.queries";
import type { CustomComponentType } from "@/features/components/components.types";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Below the confirmation it raises, above the settings page it sits on.
const DRAWER_Z_INDEX = 320;

interface CustomPartsDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function CustomPartsDrawer({ opened, onClose }: CustomPartsDrawerProps): ReactElement {
  const { t } = useTranslation();
  const { data: types, isLoading } = useCustomComponentTypes();
  const remove = useDeleteComponentType();
  const [removing, setRemoving] = useState<CustomComponentType | null>(null);
  const owned = types ?? [];

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  return (
    <>
      <Drawer
        opened={opened}
        onClose={onClose}
        position="bottom"
        radius="lg"
        zIndex={DRAWER_Z_INDEX}
        title={t("customParts.title")}
        overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
        styles={{
          content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto", maxHeight: "88dvh" },
          header: { backgroundColor: "var(--mantine-color-cards-6)" },
          body: { paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        {isLoading ? (
          <Group justify="center" py="xl">
            <Loader size="sm" color="primary.6" />
          </Group>
        ) : (
          <Stack gap="xs">
            {/* Most owners never name a part, so the empty state is the common one. */}
            {owned.length === 0 ? (
              <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
                {t("customParts.empty")}
              </Text>
            ) : (
              owned.map((type) => (
                <Group key={type.id} justify="space-between" wrap="nowrap" gap="sm">
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text c="text.6" fw={500} truncate>
                      {type.component_type}
                    </Text>
                    {/* The category tells two similar names apart, and the count is the one
                        place the owner sees what still leans on the type before removing it. */}
                    <Text fz={12} c="var(--color-text-dim)" className="font-mono" truncate>
                      {catalogueLabel(type.component_group_i18n_key, type.component_group, t)}
                      {" · "}
                      {type.parts_in_use === 0
                        ? t("customParts.unused")
                        : t("customParts.onBikes", { count: type.bikes_in_use })}
                    </Text>
                  </Stack>

                  <ActionIcon
                    variant="subtle"
                    color="red.5"
                    radius="md"
                    aria-label={t("customParts.remove")}
                    onClick={() => setRemoving(type)}
                  >
                    <Trash2 size={18} />
                  </ActionIcon>
                </Group>
              ))
            )}
          </Stack>
        )}
      </Drawer>

      {/* One question, worded by the count: the extra line exists to say that the parts
          already carrying the name survive, which is only reassuring while it is true. */}
      <ConfirmModal
        opened={removing !== null}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing === null) return;
          remove.mutate({ id: removing.id }, { onSuccess: () => setRemoving(null) });
        }}
        title={t("customParts.removeConfirmTitle", { name: removing?.component_type ?? "" })}
        body={
          removing !== null && removing.parts_in_use > 0
            ? `${t("customParts.removeConfirmBody")} ${t("customParts.removeConfirmInUse", { count: removing.parts_in_use })}`
            : t("customParts.removeConfirmBody")
        }
        cancelLabel={t("customParts.cancel")}
        confirmLabel={t("customParts.remove")}
        pending={remove.isPending}
      />
    </>
  );
}
