// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useId, useRef, useState, type CSSProperties, type ReactElement } from "react";
import {
  ActionIcon,
  Autocomplete,
  Box,
  Button,
  FileButton,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Check, Paperclip, Plus, X } from "lucide-react";
import dayjs from "dayjs";
import { Eyebrow } from "@/components/Eyebrow";
import { GroupedList, ListRow } from "@/components/GroupedList";
import { LIST_ROW_HEIGHT, listRowInputStyles } from "@/components/groupedListStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";
import { PINNED_BAR_LEFT, PINNED_BAR_WIDTH } from "@/layout/contentWidth";
import { useShopNames, useUploadServiceAttachment } from "@/features/service/service.queries";
import type { ServicePlace, UploadedAttachment } from "@/features/service/service.types";
import { disabledButtonStyles, dropdownProps } from "@/features/add_bike_page/formStyles";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { pattern } from "@/features/service/serviceDates";
import { categoryIcon } from "@/features/service/ui/categoryIcon";
import { NoteRow } from "@/features/service/ui/NoteRow";
import { PriceRow } from "@/features/service/ui/PriceRow";
import { actionNote, MAX_ATTACHMENTS, today, type CategoryBlock, type PickedAction } from "./serviceWizard.types";

// The backend's events_bikes.shop_name width.
const SHOP_NAME_MAX_LENGTH = 100;

const NOTE_MAX_LENGTH = 500;

const CATEGORY_ICON_SIZE = 14;

// A row that hangs off the one above it - a picked file, "another action" - a notch shorter.
const SUB_ROW_HEIGHT = 44;

// The row spells the month out; Czech puts the day first.
const ROW_DATE_BY_LANGUAGE: Record<string, string> = {
  cs: "D. MMM YYYY",
  en: "MMM D, YYYY",
};

// Kept rendered but out of sight: showPicker opens the native picker from the row's tap.
const HIDDEN_DATE_INPUT: CSSProperties = {
  position: "absolute",
  right: 0,
  bottom: 0,
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: "none",
};

// The pinned bar floats over the page, so the last row needs room to scroll clear of it.
// Adds to the bottom padding the page itself already carries in AddService.
const BAR_CLEARANCE = "5rem";

interface ServiceSummaryStepProps {
  blocks: CategoryBlock[];
  onEditBlock: (index: number) => void;
  onAnotherCategory: () => void;
  serviceDate: string;
  onServiceDateChange: (day: string) => void;
  place: ServicePlace;
  onPlaceChange: (place: ServicePlace) => void;
  shopName: string;
  onShopNameChange: (name: string) => void;
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
  place,
  onPlaceChange,
  shopName,
  onShopNameChange,
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
  const { t } = useTranslation();
  // Keep focused fields above the pinned bar and keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");
  // What the user has typed into the total, while they are typing it. Null the rest of the
  // time, so the field reads the wizard's own number. Emptying the field means "use the sum
  // again", but that only takes effect on blur - otherwise clearing a field to retype it
  // would flash the sum in the middle of the edit.
  const [typedTotal, setTypedTotal] = useState<string | number | null>(null);
  const upload = useUploadServiceAttachment();

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

  return (
    <>
      <Stack gap="lg" pb={BAR_CLEARANCE} ref={formRef}>
        <GroupedList title={t("addService.sectionActions")}>
          {blocks.map((block, index) => (
            <BlockRow key={block.categoryId} block={block} onEdit={() => onEditBlock(index)} />
          ))}
          <AnotherActionRow onClick={onAnotherCategory} />
        </GroupedList>

        <GroupedList title={t("addService.sectionDetails")}>
          <DateRow value={serviceDate} onChange={onServiceDateChange} />
          <PlaceRow place={place} onPlaceChange={onPlaceChange} />
          {place === "SHOP" && <ShopRow shopName={shopName} onShopNameChange={onShopNameChange} />}
          {/* Sum of the action prices until typed over (ADR 0009). */}
          <PriceRow
            label={t("addService.totalCost")}
            value={typedTotal ?? totalCost}
            onChange={changeTotal}
            onBlur={blurTotal}
          />
          <NoteRow
            label={t("addService.note")}
            value={note}
            onChange={onNoteChange}
            placeholder={t("addService.notePlaceholder")}
            maxLength={NOTE_MAX_LENGTH}
          />
          <ReceiptsRow disabled={attachments.length >= MAX_ATTACHMENTS || upload.isPending} onPick={pickFile} />
          {attachments.map((attachment) => (
            <AttachmentRow
              key={attachment.url}
              attachment={attachment}
              onRemove={() => onAttachmentRemoved(attachment.url)}
            />
          ))}
          {/* Uploaded the moment it is picked, so Save is not a long silent wait. */}
          {upload.isPending && (
            <Group gap="xs" mih={SUB_ROW_HEIGHT} wrap="nowrap">
              <Loader size="xs" />
              <Text fz={13} c="var(--color-text-dim)">
                {t("addService.uploading")}
              </Text>
            </Group>
          )}
          {upload.isError && (
            <Group mih={SUB_ROW_HEIGHT}>
              <Text fz={13} c="red.5">
                {t("addService.uploadFailed")}
              </Text>
            </Group>
          )}
        </GroupedList>
      </Stack>

      <SaveBar canSave={canSave} onSave={onSave} saving={saving} saveFailed={saveFailed} />
    </>
  );
}

// One Category Block: its category, then each Action with its note. The whole row opens it again.
function BlockRow({ block, onEdit }: { block: CategoryBlock; onEdit: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onEdit} py={14} style={{ display: "block", width: "100%", textAlign: "left" }}>
      <Group justify="space-between" wrap="nowrap" align="flex-start" gap="sm">
        <Stack gap={10} style={{ minWidth: 0 }}>
          <Group gap={6} wrap="nowrap">
            {categoryIcon(block.categoryName, CATEGORY_ICON_SIZE)}
            <Eyebrow>{catalogueLabel(block.categoryI18nKey, block.categoryName, t)}</Eyebrow>
          </Group>
          {block.actions.map((action) => (
            <ActionSummary key={action.actionId} action={action} />
          ))}
        </Stack>
        <Text fz={13} fw={500} c="primary.6" style={{ flexShrink: 0 }}>
          {t("addService.editBlock")}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

// One recorded action, with its note underneath. Composed rather than read, so what the
// Summary shows is the string the Service will be saved with — see ADR 0007.
function ActionSummary({ action }: { action: PickedAction }): ReactElement {
  const { t } = useTranslation();
  const note = actionNote(action, t);

  return (
    <Stack gap={2}>
      <Text fz={15} fw={600} c="text.6">
        {catalogueLabel(action.actionI18nKey, action.actionName, t)}
      </Text>
      {note !== "" && (
        <Text fz={13} c="var(--color-text-dim)" lh={1.4}>
          {note}
        </Text>
      )}
    </Stack>
  );
}

function AnotherActionRow({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton onClick={onClick} style={{ display: "flex", alignItems: "center", width: "100%", minHeight: SUB_ROW_HEIGHT }}>
      <Group gap={8} wrap="nowrap" c="primary.6">
        <Plus size={16} />
        <Text fz={14} fw={500}>
          {t("addService.anotherServiceAction")}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

// The date the work happened, which may be months before it was written down.
function DateRow({ value, onChange }: { value: string; onChange: (day: string) => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker(): void {
    const input = inputRef.current;
    if (input === null) return;
    try {
      input.showPicker();
    } catch {
      // No showPicker in this webview: focusing the field is the next best thing.
      input.focus();
    }
  }

  return (
    <Box pos="relative">
      <ListRow label={t("addService.serviceDate")} onClick={openPicker}>
        <Text fz={14} c="text.6" className="tabular-nums">
          {dayjs(value).format(pattern(ROW_DATE_BY_LANGUAGE, i18n.language))}
        </Text>
      </ListRow>
      <input
        ref={inputRef}
        type="date"
        value={value}
        // Work cannot have been done later than today.
        max={today()}
        tabIndex={-1}
        aria-hidden
        style={HIDDEN_DATE_INPUT}
        // The picker's Clear would leave a Service with no date to save.
        onChange={(event) => {
          if (event.currentTarget.value !== "") onChange(event.currentTarget.value);
        }}
      />
    </Box>
  );
}

// Where the work was done, set once for the whole occasion like its date (ADR 0002, ADR 0037).
function PlaceRow({
  place,
  onPlaceChange,
}: {
  place: ServicePlace;
  onPlaceChange: (place: ServicePlace) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <ListRow label={t("addService.place")}>
      <SegmentedControl
        size="xs"
        radius="md"
        aria-label={t("addService.place")}
        value={place}
        onChange={(value) => onPlaceChange(value === "SHOP" ? "SHOP" : "HOME")}
        data={[
          { value: "HOME", label: t("addService.placeHome") },
          { value: "SHOP", label: t("addService.placeShop") },
        ]}
      />
    </ListRow>
  );
}

// Suggests the names typed on earlier Services, so a usual shop is typed once.
function ShopRow({
  shopName,
  onShopNameChange,
}: {
  shopName: string;
  onShopNameChange: (name: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const { data: shopNames } = useShopNames();
  const id = useId();

  return (
    <ListRow label={t("addService.placeShop")} labelFor={id}>
      <Autocomplete
        id={id}
        variant="unstyled"
        placeholder={t("addService.shopNamePlaceholder")}
        data={shopNames ?? []}
        limit={8}
        maxLength={SHOP_NAME_MAX_LENGTH}
        value={shopName}
        onChange={onShopNameChange}
        styles={listRowInputStyles}
        comboboxProps={dropdownProps}
      />
    </ListRow>
  );
}

// Picking opens the file picker straight away; the card lists what was picked under it.
function ReceiptsRow({ disabled, onPick }: { disabled: boolean; onPick: (file: File | null) => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <FileButton onChange={onPick} accept="image/*,application/pdf" disabled={disabled}>
      {(props) => (
        <ListRow label={t("addService.attachments")} onClick={props.onClick} disabled={disabled}>
          <Text fz={14} c="text.8">
            {t("addService.attachmentAdd")}
          </Text>
        </ListRow>
      )}
    </FileButton>
  );
}

function AttachmentRow({ attachment, onRemove }: { attachment: UploadedAttachment; onRemove: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group justify="space-between" wrap="nowrap" gap="sm" mih={SUB_ROW_HEIGHT}>
      <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
        <Paperclip size={14} color="var(--mantine-color-text-8)" style={{ flexShrink: 0 }} />
        <Text fz={13} c="var(--color-text-dim)" truncate>
          {attachment.name}
        </Text>
      </Group>
      <ActionIcon variant="subtle" color="red.5" aria-label={t("addService.removeAttachment")} onClick={onRemove}>
        <X size={16} />
      </ActionIcon>
    </Group>
  );
}

// Save is the only way out of the hub, so it never scrolls away (ADR 0006, ADR 0009).
function SaveBar({
  canSave,
  onSave,
  saving,
  saveFailed,
}: {
  canSave: boolean;
  onSave: () => void;
  saving: boolean;
  saveFailed: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const keyboardOffset = useKeyboardOffset();

  return (
    <Box
      data-fixed-footer
      left={PINNED_BAR_LEFT}
      style={{
        position: "fixed",
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
      <Stack gap={6} w={PINNED_BAR_WIDTH} style={{ pointerEvents: "auto" }}>
        {/* The failure belongs beside the button that failed. */}
        {saveFailed && (
          <Text fz={13} c="red.5" ta="center">
            {t("addService.saveFailed")}
          </Text>
        )}
        <Button
          fullWidth
          color="primary.6"
          c="textDark.6"
          radius="md"
          leftSection={<Check size={18} />}
          loading={saving}
          disabled={!canSave}
          styles={disabledButtonStyles}
          onClick={onSave}
          style={{ height: LIST_ROW_HEIGHT }}
        >
          {t("addService.save")}
        </Button>
      </Stack>
    </Box>
  );
}
