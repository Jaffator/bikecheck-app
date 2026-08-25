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
import { Banknote, Check, Paperclip, Pencil, Plus, X } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useUploadServiceAttachment } from "@/features/service/service.queries";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import type { UploadedAttachment } from "@/features/service/service.types";
import { autosizeInputStyles, disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { categoryIcon } from "@/features/service/categoryIcon";
import { actionNote, today, type CategoryBlock, type PickedAction } from "./serviceWizard.types";

// A receipt, an invoice and a few photos of the work is as many as one visit needs.
const MAX_ATTACHMENTS = 10;

const CARD_ICON_SIZE = 20;

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
  // What the user has typed into the total, while they are typing it. Null the rest of the
  // time, so the field reads the wizard's own number. Emptying the field means "use the sum
  // again", but that only takes effect on blur - otherwise clearing a field to retype it
  // would flash the sum in the middle of the edit.
  const [typedTotal, setTypedTotal] = useState<string | number | null>(null);

  function pickFile(file: File | null): void {
    if (file === null) return;
    void tapFeedback();
    upload.mutate(file, { onSuccess: onAttachmentAdded });
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

  return (
    <>
      <Stack gap="md" pb={BAR_CLEARANCE}>
        {/* The date the work happened, which may be months before it was written down. */}
        {/* ---------- Service actions ---------- */}
        {blocks.map((block, index) => (
          <UnstyledButton
            key={block.categoryId}
            onClick={() => {
              void tapFeedback();
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
                backgroundImage:
                  "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
                border: "1px solid var(--color-border-subtle)",
                boxShadow:
                  "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
              }}
            >
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={6} style={{ minWidth: 0 }}>
                  <Group gap={8} align="center" wrap="nowrap">
                    {categoryIcon(block.categoryName, CARD_ICON_SIZE)}
                    <Text fw={700} fz={18} c="primary.6" lineClamp={1}>
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
        <Button
          variant="outline"
          color="secondary.6"
          radius="md"
          fullWidth
          leftSection={<Plus size={16} />}
          onClick={() => {
            void tapFeedback();
            onAnotherCategory();
          }}
        >
          {t("addService.anotherServiceAction")}
        </Button>
        {/* ---------- Service date ---------- */}
        <TextInput
          type="date"
          label={t("addService.serviceDate")}
          value={serviceDate}
          // Work cannot have been done later than today.
          max={today()}
          styles={inputStyles}
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
          styles={autosizeInputStyles}
          onChange={(event) => onNoteChange(event.currentTarget.value)}
        />

        {/* The total is not here: it is edited in the pinned bar below, where it stays in
          sight while the rest of the page scrolls. */}
        {/* ---------- Attachments ---------- */}
        <Stack gap="xs">
          <Text fz={14} c="text.6">
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
                  void tapFeedback();
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

          <FileButton onChange={pickFile} accept="image/*,application/pdf">
            {(props) => (
              <Button
                {...props}
                variant="outline"
                color="secondary.6"
                radius="md"
                leftSection={<Paperclip size={16} />}
                disabled={attachments.length >= MAX_ATTACHMENTS || upload.isPending}
                styles={disabledButtonStyles}
                style={{ alignSelf: "flex-start" }}
              >
                {t("addService.addAttachment")}
              </Button>
            )}
          </FileButton>
        </Stack>
      </Stack>

      {/* ---------- Pinned total and save ---------- */}
      {/* What the visit cost and the button that records it never scroll away: the total is
        the number the user is watching as they add work, and Save is the only way out of
        the hub (ADR 0006, ADR 0009). */}
      <Box
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
                  {/* The total reads as the number it is, and is typed over in place. */}
                  <NumberInput
                    variant="unstyled"
                    aria-label={t("addService.totalCost")}
                    value={typedTotal ?? totalCost}
                    min={0}
                    hideControls
                    w={72}
                    styles={{
                      input: {
                        padding: 0,
                        height: "auto",
                        minHeight: 0,
                        fontWeight: 700,
                        fontSize: "1.125rem",
                        color: "var(--mantine-color-text-6)",
                      },
                    }}
                    onChange={changeTotal}
                    onBlur={blurTotal}
                  />
                  <Text fw={700} fz={18} c="text.6">
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
                void tapFeedback();
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
      <Text fz={13} fw={500} c="text.6">
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
