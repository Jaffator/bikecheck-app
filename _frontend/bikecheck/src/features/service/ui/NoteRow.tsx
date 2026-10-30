// A note as one grouped-list row: its first line, and a sheet to write the whole of it in.
import { useState, type ReactElement } from "react";
import { Button, Stack, Text, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ListRow } from "@/components/GroupedList";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { autosizeInputStyles, disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOpeningCount } from "@/hooks/useOpeningCount";

interface NoteRowProps {
  label: string;
  value: string;
  onChange: (note: string) => void;
  // What the empty field suggests writing.
  placeholder?: string;
  maxLength?: number;
  disabled?: boolean;
  compact?: boolean;
}

export function NoteRow({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
  compact,
}: NoteRowProps): ReactElement {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const firstLine = value.split("\n").find((line) => line.trim() !== "") ?? "";

  return (
    <>
      <ListRow label={label} onClick={() => setOpened(true)} disabled={disabled} compact={compact}>
        <Text fz={14} c={firstLine === "" ? "text.8" : "text.7"} truncate>
          {firstLine === "" ? t("addService.addNote") : firstLine}
        </Text>
      </ListRow>
      <NoteSheet
        opened={opened}
        onClose={() => setOpened(false)}
        title={label}
        value={value}
        onSave={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
      />
    </>
  );
}

interface NoteSheetProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  value: string;
  onSave: (note: string) => void;
  placeholder?: string;
  maxLength?: number;
}

// Remounted per opening, so a note closed without Done is discarded rather than kept half-typed.
function NoteSheet(props: NoteSheetProps): ReactElement {
  const opening = useOpeningCount(props.opened);
  return <NoteSheetBody key={opening} {...props} />;
}

function NoteSheetBody({ opened, onClose, title, value, onSave, placeholder, maxLength }: NoteSheetProps): ReactElement {
  const { t } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const [draft, setDraft] = useState(value);

  function save(): void {
    onSave(draft);
    onClose();
  }

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      title={title}
      styles={{
        content: {
          height: "auto",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
          maxHeight: `calc(88dvh - ${String(keyboardOffset)}px)`,
        },
        // The desktop modal's; a bottom sheet takes the wrapper's.
        body: { paddingBottom: "2rem" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="md">
        <Textarea
          data-autofocus
          value={draft}
          placeholder={placeholder}
          maxLength={maxLength}
          autosize
          minRows={4}
          maxRows={10}
          styles={autosizeInputStyles}
          onChange={(event) => setDraft(event.currentTarget.value)}
        />
        <Button
          color="primary.6"
          c="textDark.6"
          radius="md"
          styles={disabledButtonStyles}
          onClick={save}
          style={{ height: "3rem" }}
        >
          {t("addService.noteDone")}
        </Button>
      </Stack>
    </ResponsiveSheet>
  );
}
