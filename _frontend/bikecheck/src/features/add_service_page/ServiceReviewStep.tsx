// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import {
  ActionIcon,
  Button,
  FileButton,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Text,
  Textarea,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, Paperclip, Pencil, X } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { useUploadServiceAttachment } from "@/features/service/service.queries";
import type { UploadedAttachment } from "@/features/service/service.types";
import { autosizeInputStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import type { CategoryBlock } from "./serviceWizard.types";

// A receipt, an invoice and a few photos of the work is as many as one visit needs.
const MAX_ATTACHMENTS = 10;

interface ServiceReviewStepProps {
  blocks: CategoryBlock[];
  onEditBlock: (index: number) => void;
  note: string;
  onNoteChange: (note: string) => void;
  totalCost: number;
  // Null hands the total back to the sum of the per-action prices.
  onTotalCostChange: (value: number | null) => void;
  attachments: UploadedAttachment[];
  onAttachmentAdded: (attachment: UploadedAttachment) => void;
  onAttachmentRemoved: (url: string) => void;
  onSave: () => void;
  saving: boolean;
  saveFailed: boolean;
}

// Everything the user assembled, in one view, before it is committed.
export function ServiceReviewStep({
  blocks,
  onEditBlock,
  note,
  onNoteChange,
  totalCost,
  onTotalCostChange,
  attachments,
  onAttachmentAdded,
  onAttachmentRemoved,
  onSave,
  saving,
  saveFailed,
}: ServiceReviewStepProps): ReactElement {
  const { t } = useTranslation();
  const upload = useUploadServiceAttachment();

  function pickFile(file: File | null): void {
    if (file === null) return;
    void tapFeedback();
    upload.mutate(file, { onSuccess: onAttachmentAdded });
  }

  return (
    <Stack gap="md">
      <Text fw={600} fz={15} c="text.6">
        {t("addService.reviewTitle")}
      </Text>

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
              <Stack gap={4} style={{ minWidth: 0 }}>
                <Text fw={600} fz={15} c="text.6">
                  {catalogueLabel(block.categoryI18nKey, block.categoryName, t)}
                </Text>
                {block.actions.map((action) => (
                  <Text key={action.actionId} fz={13} c="var(--color-text-dim)">
                    {catalogueLabel(action.actionI18nKey, action.actionName, t)}
                  </Text>
                ))}
              </Stack>
              {/* A correction should not cost the rest of the wizard. */}
              <Pencil size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
            </Group>
          </Paper>
        </UnstyledButton>
      ))}

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

      {/* Prefilled from the per-action prices; overwritten when a receipt includes
          labour or a discount. */}
      <NumberInput
        label={t("addService.totalCost")}
        value={totalCost}
        min={0}
        hideControls
        styles={inputStyles}
        onChange={(value) => onTotalCostChange(value === "" ? null : Number(value))}
      />

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
              style={{ alignSelf: "flex-start" }}
            >
              {t("addService.addAttachment")}
            </Button>
          )}
        </FileButton>
      </Stack>

      {saveFailed && (
        <Text fz={13} c="red.5">
          {t("addService.saveFailed")}
        </Text>
      )}

      <Button
        color="primary.6"
        radius="md"
        leftSection={<Check size={18} />}
        loading={saving}
        onClick={() => {
          void tapFeedback();
          onSave();
        }}
        style={{ height: "3rem" }}
      >
        {t("addService.save")}
      </Button>
    </Stack>
  );
}
