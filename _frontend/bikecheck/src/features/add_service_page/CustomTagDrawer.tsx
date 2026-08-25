// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { ActionIcon, Box, Button, Drawer, Group, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { useCreateActionTag, useDeleteActionTag } from "@/features/service/service.queries";
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { ActionTag } from "@/features/service/service.types";
import { disabledButtonStyles, fieldLabel, inputStyles } from "@/features/add_bike_page/formStyles";

interface CustomTagDrawerProps {
  opened: boolean;
  onClose: () => void;
  // The catalogue action the new tag belongs to. A tag says what an action includes, so
  // it is only ever a tag of one action — see ADR 0008.
  actionId: number;
  actionLabel: string;
  // Every tag on the action, seeded and the user's own alike. Only their own are listed
  // for deletion.
  tags: ActionTag[];
  // A tag the user just made is a tag they meant to use, so it arrives taken.
  onCreated: (tag: ActionTag) => void;
  // A tag that no longer exists cannot stay taken.
  onDeleted: (tag: ActionTag) => void;
}

// Where a user names work the catalogue does not. What they write joins the action's tags
// and is offered again on every later Service — see ADR 0008.
export function CustomTagDrawer({
  opened,
  onClose,
  actionId,
  actionLabel,
  tags,
  onCreated,
  onDeleted,
}: CustomTagDrawerProps): ReactElement {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const create = useCreateActionTag();
  const remove = useDeleteActionTag();

  // Seeded tags belong to everybody and to nobody, so they are not the user's to remove.
  const own = tags.filter((tag) => tag.custom);
  const trimmed = name.trim();

  function submit(): void {
    if (trimmed === "") return;
    // A name the action already carries answers with that tag rather than a second one,
    // so writing an existing name simply takes it.
    create.mutate(
      { event_action_id: actionId, tag: trimmed },
      {
        onSuccess: (tag) => {
          onCreated(tag);
          setName("");
          onClose();
        },
      },
    );
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      // Fits a short list and caps a long one for scrolling.
      size="md"
      radius="md"
      title={
        <Group gap={6} justify="center" wrap="nowrap">
          <Pencil size={16} />
          <span>{t("addService.customTagTitle", { action: actionLabel })}</span>
        </Group>
      }
      // Keeps background content visually inactive.
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "85dvh",
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        body: {
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        },
        title: {
          fontWeight: 600,
          color: "var(--mantine-color-text-7)",
          // Centers independently of the close button.
          flex: 1,
          textAlign: "center",
        },
      }}
    >
      {/* Fills the drawer body so the save button keeps the bottom edge however short
          the tag list is; the list above it shrinks and scrolls instead. */}
      <Stack
        gap="md"
        pb="calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        style={{ flex: 1, minHeight: 0 }}
      >
        <Text fz={13} c="var(--color-text-dim)">
          {t("addService.customTagFor", { action: actionLabel })}
        </Text>

        <TextInput
          // label={t("addService.customTagLabel")}
          placeholder={t("addService.customTagPlaceholder")}
          value={name}
          maxLength={60}
          styles={inputStyles}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
        />

        {create.isError && (
          <Text fz={13} c="red.5">
            {t("addService.customTagFailed")}
          </Text>
        )}

        {own.length > 0 && (
          <Stack gap={6} style={{ minHeight: 0, overflowY: "auto" }}>
            <Text fz={13} c="text.7">
              {t("addService.customTagYours")} :
            </Text>
            {own.map((tag) => (
              <Group key={tag.id} justify="space-between" wrap="nowrap" gap="sm">
                <Box style={{ minWidth: 0 }}>
                  <Text fz={14} c="text.6" truncate>
                    {catalogueLabel(tag.i18n_key, tag.tag, t)}
                  </Text>
                </Box>
                <ActionIcon
                  variant="subtle"
                  color="red.5"
                  radius="xl"
                  aria-label={t("addService.customTagDelete")}
                  disabled={remove.isPending}
                  onClick={() => {
                    // Services that already quoted this tag keep its name: what they hold
                    // is prose, not a reference — see ADR 0007.
                    remove.mutate(tag.id, { onSuccess: () => onDeleted(tag) });
                  }}
                >
                  <Trash2 size={18} />
                </ActionIcon>
              </Group>
            ))}
          </Stack>
        )}
        <Button
          color="primary.6"
          radius="md"
          mt="auto"
          disabled={trimmed === "" || create.isPending}
          loading={create.isPending}
          styles={disabledButtonStyles}
          onClick={submit}
          style={{ height: "3rem" }}
        >
          {t("addService.customTagSave")}
        </Button>
      </Stack>
    </Drawer>
  );
}
