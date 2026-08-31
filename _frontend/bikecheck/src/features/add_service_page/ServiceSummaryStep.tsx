// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import {
  ActionIcon,
  Box,
  Button,
  FileButton,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Banknote, Calendar, Check, NotepadText, Paperclip, Pencil, Plus, X } from "lucide-react";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { useUploadServiceAttachment } from "@/features/service/service.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import type { UploadedAttachment } from "@/features/service/service.types";
import { autosizeInputStyles, disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { categoryIcon } from "@/features/service/categoryIcon";
import { actionNote, today, type CategoryBlock, type PickedAction } from "./serviceWizard.types";
// import { bikecheckIconType } from "@/assets/icons/bikecheck";
// import { RefreshCcw } from "lucide-react";
// const BikecheckIcon = bikecheckIconType("Bikecheck")!;

// A receipt, an invoice and a few photos of the work is as many as one visit needs.
const MAX_ATTACHMENTS = 10;

const CARD_ICON_SIZE = 20;

// What names a field rather than a card: the size the add-bike wizard already gives an
// icon sitting inside an input.
const ICON_SIZE = 18;

// A section is centred over the whole input by default. An autosize textarea is only as
// tall as what it holds, so the icon has to be pinned to the first line instead; the
// padding matches the input's own top padding.
const FIELD_ICON_TOP: React.CSSProperties = {
  alignItems: "flex-start",
  paddingTop: "0.45rem",
};

// The Summary reads as a recap rather than a form, so its labels sit quieter and smaller
// than the shared field label. Local on purpose: `fieldLabel` names controls everywhere
// else and is not this step's to change.
const summaryLabel = {
  ...inputStyles.label,
  color: "var(--color-text-dim)",
  fontSize: 13,
} as React.CSSProperties;

const summaryInputStyles = { ...inputStyles, label: summaryLabel };
const summaryAutosizeInputStyles = {
  ...autosizeInputStyles,
  label: summaryLabel,
};

// The pinned bar floats over the page, so the last field needs room to scroll clear of it.
// Adds to the bottom padding the page itself already carries in AddService.
const BAR_CLEARANCE = "5rem";

interface ServiceSummaryStepProps {
  blocks: CategoryBlock[];
  onEditBlock: (index: number) => void;
  onAnotherCategory: () => void;
  serviceDate: string;
  onServiceDateChange: (day: string) => void;
  note: string;
  onNoteChange: (note: string) => void;
  totalCost: number;
  // Null hands the total back to the sum of the per-action prices.
  onTotalCostChange: (value: number | null) => void;
  attachments: UploadedAttachment[];
  onAttachmentAdded: (attachment: UploadedAttachment) => void;
  onAttachmentRemoved: (url: string) => void;
  canSave: boolean;
  onSave: () => void;
  saving: boolean;
  saveFailed: boolean;
}

// The wizard's hub: everything the user assembled, and the only way on — see ADR 0006.
// Date, note, total and attachments belong to the occasion, so they live here rather
// than beside the actions (ADR 0002).
export function ServiceSummaryStep({
  blocks,
  onEditBlock,
  onAnotherCategory,
  serviceDate,
  onServiceDateChange,
  note,
  onNoteChange,
  totalCost,
  onTotalCostChange,
  attachments,
  onAttachmentAdded,
  onAttachmentRemoved,
  canSave,
  onSave,
  saving,
  saveFailed,
}: ServiceSummaryStepProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const upload = useUploadServiceAttachment();
  const keyboardOffset = useKeyboardOffset();
  // Keep focused fields above the pinned bar and keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  // What the user has typed into the total, while they are typing it. Null the rest of the
  // time, so the field reads the wizard's own number. Emptying the field means "use the sum
  // again", but that only takes effect on blur - otherwise clearing a field to retype it
  // would flash the sum in the middle of the edit.
  const [typedTotal, setTypedTotal] = useState<string | number | null>(null);

  function pickFile(file: File | null): void {
    if (file === null) return;
    upload.mutate(file, {
      onSuccess: (uploaded) => {
        onAttachmentAdded(uploaded);
        // The mutation holds on to what it was called with, so a photo the size of a
        // camera shot would stay in memory long after it reached the server. Android
        // reclaims the app while the picker is open, and every megabyte still held makes
        // that likelier on the next attachment.
        upload.reset();
      },
    });
  }

  function changeTotal(value: string | number): void {
    setTypedTotal(value);
    if (value === "") return;
    onTotalCostChange(Number(value));
  }

  function blurTotal(): void {
    if (typedTotal === "") onTotalCostChange(null);
    setTypedTotal(null);
  }

  // The total field grows with what is typed into it. `ch` is the width of a zero in the
  // element's own font, so the measurement has to be made on the input, which is bold and
  // larger than the root the width prop would land on. The extra half leaves the caret a
  // place to sit past the last digit.
  const totalWidth = `${Math.max(String(typedTotal ?? totalCost).length, 1) + 0.2}ch`;

  return (
    <>
      <Stack gap="md" pb={BAR_CLEARANCE} ref={formRef}>
        {/* The date the work happened, which may be months before it was written down. */}
        {/* ---------- Service actions ---------- */}
        {blocks.map((block, index) => (
          <UnstyledButton
            key={block.categoryId}
            onClick={() => {
              onEditBlock(index);
            }}
            style={{ display: "block", width: "100%", textAlign: "left" }}
          >
            <Paper
              radius="lg"
              p="md"
              style={{
                // Colour, glow and inner edge all live in this one object: `bg` would emit the
                // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
                backgroundColor: "var(--mantine-color-cards-6)",
                backgroundImage: "var(--card-glow)",
                border: "1px solid var(--mantine-color-cards-6)",
                boxShadow: "var(--elev-panel)",
              }}
              className="active:scale-[0.985]"
            >
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={6} style={{ minWidth: 0 }}>
                  <Group gap={8} align="center" wrap="nowrap">
                    {categoryIcon(block.categoryName, CARD_ICON_SIZE)}
                    <Text fw={700} fz={18} c="text.6" lineClamp={1}>
                      {catalogueLabel(block.categoryI18nKey, block.categoryName, t)}
                    </Text>
                  </Group>
                  {block.actions.map((action) => (
                    <ActionSummary key={action.actionId} action={action} />
                  ))}
                </Stack>
                {/* A correction should not cost the rest of the wizard. */}
                <Pencil size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
              </Group>
            </Paper>
          </UnstyledButton>
        ))}
        {/* ---------- Add another service action ---------- */}
        {/* The next card in the stack, still empty: the shape of the blocks above, drawn as
            an outline waiting to be filled rather than a surface that already holds
            something. */}
        <UnstyledButton
          onClick={() => {
            onAnotherCategory();
          }}
          style={{ display: "block", width: "100%" }}
        >
          <Paper
            radius="lg"
            p="sm"
            style={{
              // Half the cards' own surface, so it sits on the same material without
              // claiming to hold anything yet.
              backgroundColor: "color-mix(in srgb, var(--mantine-color-cards-6) 75%, transparent)",
              border: "1px solid var(--mantine-color-cards-5)",
            }}
            className="active:scale-[0.985]"
          >
            <Group gap={8} justify="center" wrap="nowrap" c="var(--color-text-dim)">
              <Plus size={18} />
              <Text fw={600} fz={15}>
                {t("addService.anotherServiceAction")}
              </Text>
            </Group>
          </Paper>
        </UnstyledButton>
        {/* ---------- Service date ---------- */}
        <TextInput
          type="date"
          label={t("addService.serviceDate")}
          value={serviceDate}
          // Work cannot have been done later than today.
          max={today()}
          styles={summaryInputStyles}
          // Decoration only. global.css hides the browser's own calendar indicator, so this
          // is the one calendar in the field; the picker still opens on a tap anywhere in it.
          rightSection={<Calendar size={ICON_SIZE} color="var(--color-text-dim)" />}
          onChange={(event) => onServiceDateChange(event.currentTarget.value)}
        />
        {/* ---------- Note ---------- */}
        <Textarea
          label={t("addService.note")}
          placeholder={t("addService.notePlaceholder")}
          value={note}
          autosize
          minRows={2}
          maxLength={500}
          styles={summaryAutosizeInputStyles}
          rightSection={<NotepadText size={ICON_SIZE} color="var(--color-text-dim)" />}
          // The field grows as it is filled, and a centred section would drift down with it.
          // Pinned to the top so the icon keeps sitting beside the first line.
          rightSectionProps={{ style: FIELD_ICON_TOP }}
          onChange={(event) => onNoteChange(event.currentTarget.value)}
        />

        {/* The total is not here: it is edited in the pinned bar below, where it stays in
          sight while the rest of the page scrolls. */}
        {/* ---------- Attachments ---------- */}
        <Stack gap="xs">
          <Text fz={13} c="text.7" fw={100}>
            {t("addService.attachments")}
          </Text>

          {attachments.map((attachment) => (
            <Group key={attachment.url} justify="space-between" wrap="nowrap">
              <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                <Paperclip size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
                  {attachment.name}
                </Text>
              </Group>
              <ActionIcon
                variant="subtle"
                color="red.5"
                aria-label={t("addService.removeAttachment")}
                onClick={() => {
                  onAttachmentRemoved(attachment.url);
                }}
              >
                <X size={16} />
              </ActionIcon>
            </Group>
          ))}

          {/* Uploaded the moment it is picked, so Save is not a long silent wait. */}
          {upload.isPending && (
            <Group gap="xs">
              <Loader size="xs" />
              <Text fz={13} c="var(--color-text-dim)">
                {t("addService.uploading")}
              </Text>
            </Group>
          )}

          {upload.isError && (
            <Text fz={13} c="red.5">
              {t("addService.uploadFailed")}
            </Text>
          )}

          {/* The same empty-card shape as "add another category" above: both are a slot
              waiting to be filled, so they read as one kind of thing. */}
          <FileButton onChange={pickFile} accept="image/*,application/pdf">
            {(props) => {
              const full = attachments.length >= MAX_ATTACHMENTS || upload.isPending;
              return (
                <UnstyledButton {...props} disabled={full} style={{ display: "block", width: "100%" }}>
                  <Paper
                    radius="lg"
                    p="sm"
                    style={{
                      // Half the cards' own surface, so it sits on the same material without
                      // claiming to hold anything yet.
                      backgroundColor: "color-mix(in srgb, var(--mantine-color-cards-6) 80%, transparent)",
                      border: "1px solid var(--mantine-color-cards-5)",
                      opacity: full ? 0.5 : 1,
                    }}
                    className="active:scale-[0.985]"
                  >
                    <Group gap={8} justify="center" wrap="nowrap" c="var(--color-text-dim)">
                      <Paperclip size={18} />
                      <Text fw={600} fz={15}>
                        {t("addService.addAttachment")}
                      </Text>
                    </Group>
                  </Paper>
                </UnstyledButton>
              );
            }}
          </FileButton>
        </Stack>
      </Stack>

      {/* ---------- Pinned total and save ---------- */}
      {/* What the visit cost and the button that records it never scroll away: the total is
        the number the user is watching as they add work, and Save is the only way out of
        the hub (ADR 0006, ADR 0009). */}
      <Box
        data-fixed-footer
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          // Rides above the software keyboard, which the webview does not resize for.
          transform: `translateY(-${keyboardOffset}px)`,
          display: "flex",
          justifyContent: "center",
          paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
          zIndex: 100,
          // Only the bar itself takes taps; the rest of this strip is page underneath.
          pointerEvents: "none",
        }}
      >
        {/* Fades page content out under the bar instead of cutting it off. */}
        <Box
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "8rem",
            background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
        <Stack
          gap={6}
          w="92%"
          px="md"
          py="sm"
          className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
          style={{
            pointerEvents: "auto",
            boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
          }}
        >
          {/* The failure belongs beside the button that failed. */}
          {saveFailed && (
            <Text fz={13} c="red.5">
              {t("addService.saveFailed")}
            </Text>
          )}
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Group gap={10} wrap="nowrap" style={{ minWidth: 0 }}>
              <Banknote size={28} color="var(--mantine-color-primary-5)" style={{ flexShrink: 0 }} />
              <Stack gap={0} style={{ minWidth: 0 }}>
                <Text fz={12} c="text.8" lh={1.3}>
                  {t("addService.totalCost")}:
                </Text>
                <Group gap={4} wrap="nowrap" align="center">
                  {/* The total reads as the number it is, and is typed over in place. Sized
                      to the digits it holds rather than a fixed width, so the currency stays
                      against the number the way the actions bar writes it. */}
                  <NumberInput
                    variant="unstyled"
                    aria-label={t("addService.totalCost")}
                    value={typedTotal ?? totalCost}
                    min={0}
                    hideControls
                    styles={{
                      root: { width: "fit-content", flexShrink: 0 },
                      input: {
                        width: totalWidth,
                        padding: 0,
                        height: "auto",
                        minHeight: 0,
                        borderRadius: 0,
                        fontWeight: 700,
                        fontSize: "1.125rem",
                        lineHeight: 1.1,
                        color: "var(--mantine-color-text-6)",
                      },
                    }}
                    onChange={changeTotal}
                    onBlur={blurTotal}
                  />
                  <Text fw={700} fz={18} c="text.6" lh={1.2}>
                    {currencySymbol(user?.currency ?? null, i18n.language)}
                  </Text>
                </Group>
              </Stack>
            </Group>
            <Button
              color="primary.6"
              radius="xl"
              leftSection={<Check size={18} />}
              loading={saving}
              disabled={!canSave}
              styles={disabledButtonStyles}
              onClick={() => {
                onSave();
              }}
              style={{ height: "2.75rem", flexShrink: 0 }}
            >
              {t("addService.save")}
            </Button>
          </Group>
        </Stack>
      </Box>
    </>
  );
}

// One recorded action, with its note underneath. Composed rather than read, so what the
// Summary shows is the string the Service will be saved with — see ADR 0007.
function ActionSummary({ action }: { action: PickedAction }): ReactElement {
  const { t } = useTranslation();
  const note = actionNote(action, t);

  return (
    <Stack gap={2}>
      <Text fz={14} fw={500} c="text.6" lineClamp={1}>
        {catalogueLabel(action.actionI18nKey, action.actionName, t)}
      </Text>
      {note !== "" && (
        <Text fz={12} c="text.8">
          {note}
        </Text>
      )}
    </Stack>
  );
}
