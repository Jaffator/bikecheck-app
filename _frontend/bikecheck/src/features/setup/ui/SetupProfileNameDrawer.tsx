// Where a Setup Profile is named: a new one, blank or as a copy of the one being read, or
// an existing one being renamed. One sheet for both, because both ask for the same thing.
import { useEffect, useState, type ReactElement } from "react";
import { ActionIcon, Button, Drawer, Group, Stack, Switch, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { SheetGrabber } from "@/components/SheetGrabber";
import type { ApiError } from "@/api/client";
import { disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { useCreateSetupProfile, useUpdateSetupProfile } from "../setup.queries";
import type { SetupProfile } from "../setup.types";

// Above the page, below the confirmations that may be raised over it.
const DRAWER_Z_INDEX = 320;
// What the API accepts (CreateSetupProfileDto).
const NAME_MAX_LENGTH = 50;

interface SetupProfileNameDrawerProps {
  opened: boolean;
  onClose: () => void;
  bikeId: number;
  // The profile being renamed, or null when one is being created.
  profile: SetupProfile | null;
  // The profile a new one may start as a copy of; null when the bike has no saved one yet.
  copySource: SetupProfile | null;
  // Whether the copy switch starts on: the menu's Duplicate does, the "+" chip does not.
  copyByDefault: boolean;
  onSaved: (profile: SetupProfile) => void;
}

// Remounting the body on each opening discards a cancelled name: the field is born from the
// profile rather than reset back to it, and a second "+" does not inherit the first.
export function SetupProfileNameDrawer(props: SetupProfileNameDrawerProps): ReactElement {
  return <SetupProfileNameBody key={bodyKey(props)} {...props} />;
}

function bodyKey({ opened, profile, copyByDefault }: SetupProfileNameDrawerProps): string {
  if (!opened) return "closed";
  if (profile !== null) return `rename-${String(profile.id)}`;
  return copyByDefault ? "duplicate" : "create";
}

function SetupProfileNameBody({
  opened,
  onClose,
  bikeId,
  profile,
  copySource,
  copyByDefault,
  onSaved,
}: SetupProfileNameDrawerProps): ReactElement {
  const { t } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const create = useCreateSetupProfile();
  const update = useUpdateSetupProfile();

  // A remounted Drawer that mounts already open skips its enter transition, so it mounts
  // closed and slides up on the next frame (docs/conventions/drawers.md).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!opened) return;
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [opened]);

  const renaming = profile !== null;
  const [name, setName] = useState(profile?.name ?? "");
  const [copy, setCopy] = useState(copyByDefault && copySource !== null);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  const trimmed = name.trim();
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  // The same name again is not a rename, so the button waits for a different one.
  const unchanged = renaming && trimmed === profile.name;

  function submit(): void {
    if (trimmed === "" || pending) return;
    if (renaming) {
      update.mutate({ id: profile.id, data: { name: trimmed } }, { onSuccess: onSaved });
      return;
    }
    const copyOf = copy && copySource !== null ? { copy_of: copySource.id } : {};
    create.mutate({ bikeId, data: { name: trimmed, ...copyOf } }, { onSuccess: onSaved });
  }

  return (
    <Drawer
      opened={opened && visible}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={DRAWER_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          height: "auto",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
          maxHeight: `calc(100dvh - ${String(keyboardOffset)}px)`,
        },
        body: { paddingTop: 0 },
      }}
    >
      {/* The same grab bar and heading every sheet wears. */}
      <SheetGrabber onClose={onClose} />

      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm" mt="md" mb="md">
        <Text fz={20} fw={700} c="text.6" lineClamp={2}>
          {renaming ? t("setup.renameTitle") : t("setup.newProfileTitle")}
        </Text>
        <ActionIcon
          variant="subtle"
          color="gray"
          radius="xl"
          size="md"
          aria-label={t("action.close")}
          onClick={onClose}
          style={{ flexShrink: 0 }}
        >
          <X size={18} color="var(--color-text-dim)" />
        </ActionIcon>
      </Group>

      <Stack gap="md" pb="calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
        <TextInput
          label={t("setup.profileName")}
          placeholder={t("setup.profileNamePlaceholder")}
          styles={inputStyles}
          value={name}
          maxLength={NAME_MAX_LENGTH}
          data-autofocus
          // A name refused by the server is answered on the field that asked for it.
          error={isNameTaken(error) ? t("setup.nameTaken") : undefined}
          onChange={(event) => setName(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            submit();
          }}
        />

        {/* Only a saved profile can be copied; the unsaved default has no row to copy. */}
        {!renaming && copySource !== null && (
          <Switch
            withThumbIndicator={false}
            checked={copy}
            onChange={(event) => setCopy(event.currentTarget.checked)}
            label={t("setup.copyOf", { name: copySource.name })}
            styles={{
              label: { color: "var(--mantine-color-text-6)", fontSize: 14 },
              track: {
                backgroundColor: copy ? "var(--mantine-color-primary-6)" : "var(--mantine-color-cards-4)",
                borderColor: "var(--mantine-color-other-borderSolid)",
              },
              thumb: { backgroundColor: copy ? "var(--mantine-color-black)" : "var(--mantine-color-text-6)" },
            }}
          />
        )}

        {/* Any other failure leaves the sheet standing, so nothing typed is lost. */}
        {error !== null && !isNameTaken(error) && (
          <Text fz={13} c="red.5">
            {t("setup.profileSaveFailed")}
          </Text>
        )}

        <Button
          color="primary.6"
          radius="md"
          styles={disabledButtonStyles}
          loading={pending}
          disabled={trimmed === "" || unchanged}
          onClick={submit}
        >
          {renaming ? t("setup.renameAction") : t("setup.createAction")}
        </Button>
      </Stack>
    </Drawer>
  );
}

// Two profiles on one bike never share a name; the API says so with 409.
function isNameTaken(error: ApiError | null): boolean {
  return error !== null && error.status === 409;
}
