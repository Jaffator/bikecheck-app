// PROTOTYPE (proto/desktop-wizards): the Summary as a live side panel - head, scrolling body, pinned total and Save.
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import {
  ActionIcon,
  Autocomplete,
  Box,
  Button,
  FileButton,
  Group,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Calendar, Check, Paperclip, Store, X } from "lucide-react";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import type { ListedBike } from "@/features/bikes/bikes.types";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { useShopNames } from "@/features/service/service.queries";
import { catalogueLabel, componentTypeLabel } from "@/features/service/serviceLabels";
import { useCurrentUser } from "@/features/users/users.queries";
import { currencySymbol } from "@/utils/money";
import {
  autosizeInputStyles,
  disabledButtonStyles,
  dropdownProps,
  inputStyles,
} from "@/features/add_bike_page/formStyles";
import { today, type CategoryBlock, type PickedAction } from "../serviceWizard.types";
import { COPY } from "./serviceCopy";
import type { ServiceDesktopPrototypeState } from "./useServiceDesktopPrototype";

// Clears the 3rem header plus a rem of air once the page scrolls the panel up to it.
const PANEL_TOP = "4rem";
// Kept clear under the panel: the page's own bottom padding, so a full panel adds no scroll to it.
const PANEL_BOTTOM_AIR = 32;

const BIKE_DOT_SIZE = 10;

// The panel starts beside the first card and sticks under the header later, so the room
// beneath it changes as the page scrolls. Written straight to the element: no re-render per frame.
function fitToWindow(element: HTMLElement | null): void {
  if (element === null) return;
  const room = window.innerHeight - element.getBoundingClientRect().top - PANEL_BOTTOM_AIR;
  element.style.maxHeight = `${String(room)}px`;
}

function usePanelRoom(): RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement>(null);

  // The heading above the panel changes height with what is loaded, and that fires no event.
  useLayoutEffect(() => {
    fitToWindow(ref.current);
  });

  useEffect(() => {
    const refit = (): void => fitToWindow(ref.current);
    window.addEventListener("scroll", refit, { passive: true });
    window.addEventListener("resize", refit);
    return () => {
      window.removeEventListener("scroll", refit);
      window.removeEventListener("resize", refit);
    };
  }, []);

  return ref;
}

const SHOP_NAME_MAX_LENGTH = 100;

const panelLabel: CSSProperties = { ...inputStyles.label, fontSize: 13 };
const panelInputStyles = { ...inputStyles, label: panelLabel };
const panelAutosizeStyles = { ...autosizeInputStyles, label: panelLabel };

const dashedSlot: CSSProperties = {
  border: "1px dashed var(--mantine-color-cards-4)",
  borderRadius: "0.75rem",
};

interface ServicePanelPrototypeProps {
  proto: ServiceDesktopPrototypeState;
  // The panel asks; the page decides whether ticked work has to be confirmed away first.
  onRequestBike: (bikeId: number) => void;
}

export function ServicePanelPrototype({ proto, onRequestBike }: ServicePanelPrototypeProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const currency = currencySymbol(user?.currency ?? null, i18n.language);
  const panelRef = usePanelRoom();

  return (
    <Paper
      ref={panelRef}
      component="aside"
      aria-label={COPY.panelTitle}
      radius="lg"
      style={{
        position: "sticky",
        top: PANEL_TOP,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "1px solid var(--mantine-color-cards-6)",
        boxShadow: "var(--elev-panel)",
      }}
    >
      <Text fw={700} fz={16} c="text.6" px="lg" pt="lg" pb="sm">
        {COPY.panelTitle}
      </Text>

      {/* Everything but the total and Save scrolls inside the panel. */}
      <Stack
        gap="md"
        px="lg"
        pb="md"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
        }}
      >
        <BikeSelect bikes={proto.bikes ?? []} bikeId={proto.bikeId} onRequestBike={onRequestBike} />

        <DoneList proto={proto} currency={currency} />

        <Box style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
          {/* Both labelled the same way, so the two controls share a baseline. */}
          <Stack gap={4}>
            <Text style={panelLabel}>{t("addService.serviceDate")}</Text>
            <TextInput
              type="date"
              aria-label={t("addService.serviceDate")}
              value={proto.serviceDate}
              max={today()}
              styles={panelInputStyles}
              className="tabular-nums"
              rightSection={<Calendar size={16} color="var(--color-text-dim)" />}
              onChange={(event) => proto.setServiceDate(event.currentTarget.value)}
            />
          </Stack>
          <Stack gap={4}>
            <Text style={panelLabel}>{t("addService.place")}</Text>
            <SegmentedControl
              fullWidth
              aria-label={t("addService.place")}
              value={proto.place}
              onChange={(value) => proto.setPlace(value === "SHOP" ? "SHOP" : "HOME")}
              data={[
                { value: "HOME", label: t("addService.placeHome") },
                { value: "SHOP", label: t("addService.placeShop") },
              ]}
            />
          </Stack>
        </Box>

        {proto.place === "SHOP" && (
          <ShopNameField shopName={proto.shopName} onShopNameChange={proto.setShopName} />
        )}

        <Textarea
          label={t("addService.note")}
          placeholder={t("addService.notePlaceholder")}
          value={proto.note}
          autosize
          minRows={2}
          maxLength={500}
          styles={panelAutosizeStyles}
          onChange={(event) => proto.setNote(event.currentTarget.value)}
        />

        <AttachmentsField files={proto.files} onAdd={proto.addFiles} onRemove={proto.removeFile} />
      </Stack>

      <PanelFooter proto={proto} currency={currency} />
    </Paper>
  );
}

// Each bike wears the colour dot it has on the dashboard, in the field and in the list.
function BikeSelect({
  bikes,
  bikeId,
  onRequestBike,
}: {
  bikes: ListedBike[];
  bikeId: number | null;
  onRequestBike: (bikeId: number) => void;
}): ReactElement {
  const picked = bikes.find((bike) => bike.id === bikeId);

  return (
    <Select
      label={COPY.bike}
      data={bikes.map((bike) => ({ value: String(bike.id), label: bikeTitle(bike) }))}
      value={bikeId === null ? null : String(bikeId)}
      allowDeselect={false}
      styles={panelInputStyles}
      comboboxProps={dropdownProps}
      leftSection={
        picked === undefined ? undefined : <BikeColorDot colorIndex={picked.color_index} size={BIKE_DOT_SIZE} />
      }
      leftSectionPointerEvents="none"
      renderOption={({ option, checked }) => (
        <Group gap={10} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
          <BikeColorDot
            colorIndex={bikes.find((bike) => String(bike.id) === option.value)?.color_index ?? null}
            size={BIKE_DOT_SIZE}
          />
          <Text fz={14} fw={600} c="text.6" lineClamp={1} style={{ flex: 1, minWidth: 0 }}>
            {option.label}
          </Text>
          {checked && (
            <Check size={16} strokeWidth={2.8} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0 }} />
          )}
        </Group>
      )}
      onChange={(value) => {
        if (value !== null && Number(value) !== bikeId) onRequestBike(Number(value));
      }}
    />
  );
}

// What was done, grouped by category in the left column's order. Each row jumps back to its card.
function DoneList({ proto, currency }: { proto: ServiceDesktopPrototypeState; currency: string }): ReactElement {
  const { t } = useTranslation();
  const ordered: CategoryBlock[] =
    proto.categories === undefined
      ? proto.blocks
      : proto.categories.flatMap((category) =>
          proto.blocks.filter((block) => block.categoryId === category.group_id),
        );

  return (
    <Stack gap={6}>
      <Text style={panelLabel}>{t("addService.stepActions")}</Text>
      {ordered.length === 0 && (
        <Text fz={13} c="var(--color-text-dim)" ta="center" px="sm" py="md" style={dashedSlot}>
          {COPY.nothingDone}
        </Text>
      )}
      {ordered.map((block) => (
        <Box key={block.categoryId} pt={10} style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
          <Text fz={11} fw={600} tt="uppercase" lts="var(--tracking-label)" c="primary.6" mb={2}>
            {catalogueLabel(block.categoryI18nKey, block.categoryName, t)}
          </Text>
          {block.actions.map((action) => (
            <DoneRow
              key={action.actionId}
              action={action}
              currency={currency}
              onShow={() => proto.showAction(block.categoryId, action.actionId)}
              onRemove={() => proto.removeAction(action.actionId)}
            />
          ))}
        </Box>
      ))}
    </Stack>
  );
}

function DoneRow({
  action,
  currency,
  onShow,
  onRemove,
}: {
  action: PickedAction;
  currency: string;
  onShow: () => void;
  onRemove: () => void;
}): ReactElement {
  const { t } = useTranslation();
  const label = catalogueLabel(action.actionI18nKey, action.actionName, t);
  const parts = action.candidates.filter((component) => action.componentIds.includes(component.id));
  const missingPart = parts.length === 0;
  // A Replacement reads as what came off and what went on.
  const sub = parts
    .map((component) => {
      const name = componentTypeLabel(component, t);
      const goingOn = action.newDescriptions[component.id]?.trim();
      return action.replaceAction && goingOn ? `${name} → ${goingOn}` : name;
    })
    .join(", ");

  return (
    <Group gap={6} wrap="nowrap" align="center">
      <UnstyledButton onClick={onShow} py={5} style={{ flex: 1, minWidth: 0 }}>
        <Text fz={14} fw={600} c="text.6" lineClamp={1}>
          {label}
        </Text>
        <Text fz={13} c={missingPart ? "orange.5" : "var(--color-text-dim)"} lineClamp={2}>
          {missingPart ? COPY.pickPart : sub}
        </Text>
      </UnstyledButton>
      {action.partialCost !== null && (
        <Text fz={13} fw={600} c="text.6" className="tabular-nums" style={{ whiteSpace: "nowrap" }}>
          {action.partialCost} {currency}
        </Text>
      )}
      <ActionIcon variant="transparent" aria-label={`${COPY.remove} ${label}`} onClick={onRemove}>
        <X size={15} color="var(--color-text-dim)" />
      </ActionIcon>
    </Group>
  );
}

function ShopNameField({
  shopName,
  onShopNameChange,
}: {
  shopName: string;
  onShopNameChange: (name: string) => void;
}): ReactElement {
  const { t } = useTranslation();
  const { data: shopNames } = useShopNames();

  return (
    <Autocomplete
      label={t("addService.shopName")}
      placeholder={t("addService.shopNamePlaceholder")}
      data={shopNames ?? []}
      limit={8}
      maxLength={SHOP_NAME_MAX_LENGTH}
      value={shopName}
      onChange={onShopNameChange}
      styles={panelInputStyles}
      comboboxProps={dropdownProps}
      rightSection={<Store size={16} color="var(--color-text-dim)" />}
    />
  );
}

// Held in memory only: the stubbed Save would leave a real upload orphaned.
function AttachmentsField({
  files,
  onAdd,
  onRemove,
}: {
  files: File[];
  onAdd: (files: File[]) => void;
  onRemove: (index: number) => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={6}>
      <Text style={panelLabel}>{t("addService.attachments")}</Text>
      {files.map((file, index) => (
        <Group key={`${file.name}:${String(index)}`} justify="space-between" wrap="nowrap">
          <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
            <Paperclip size={14} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
            <Text fz={13} c="var(--color-text-dim)" lineClamp={1}>
              {file.name}
            </Text>
          </Group>
          <ActionIcon
            variant="subtle"
            color="red.5"
            aria-label={t("addService.removeAttachment")}
            onClick={() => onRemove(index)}
          >
            <X size={15} />
          </ActionIcon>
        </Group>
      ))}
      <FileButton multiple onChange={onAdd} accept="image/*,application/pdf">
        {(props) => (
          <UnstyledButton
            {...props}
            className="hover-veil"
            p="sm"
            style={{ ...dashedSlot, textAlign: "center" }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              onAdd(Array.from(event.dataTransfer.files));
            }}
          >
            <Group gap={8} justify="center" wrap="nowrap">
              <Paperclip size={16} color="var(--mantine-color-primary-5)" />
              <Text fw={600} fz={14} c="text.6">
                {t("addService.addAttachment")}
              </Text>
            </Group>
            <Text fz={13} c="var(--color-text-dim)">
              {COPY.dropHint}
            </Text>
          </UnstyledButton>
        )}
      </FileButton>
    </Stack>
  );
}

// The total and Save never scroll away (ADR 0009); the total is typed over in place.
function PanelFooter({ proto, currency }: { proto: ServiceDesktopPrototypeState; currency: string }): ReactElement {
  const { t } = useTranslation();
  // What is being typed; an emptied field hands the sum back only on blur.
  const [typedTotal, setTypedTotal] = useState<string | number | null>(null);

  function changeTotal(value: string | number): void {
    setTypedTotal(value);
    if (value === "") return;
    proto.setTotalCost(Number(value));
  }

  function blurTotal(): void {
    if (typedTotal === "") proto.setTotalCost(null);
    setTypedTotal(null);
  }

  const totalWidth = `${String(Math.max(String(typedTotal ?? proto.totalCost).length, 1) + 0.5)}ch`;

  return (
    <Stack gap="sm" px="lg" pt="md" pb="lg" style={{ borderTop: "1px solid var(--color-border-subtle)" }}>
      <Group justify="space-between" align="baseline" wrap="nowrap">
        <Text fz={14} c="var(--color-text-dim)">
          {t("addService.totalCost")}
        </Text>
        <Group gap={6} wrap="nowrap" align="baseline">
          <NumberInput
            variant="unstyled"
            aria-label={t("addService.totalCost")}
            value={typedTotal ?? proto.totalCost}
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
                textAlign: "right",
                fontWeight: 700,
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: "var(--tracking-title)",
                fontVariantNumeric: "tabular-nums",
                color: "var(--mantine-color-text-6)",
              },
            }}
            onChange={changeTotal}
            onBlur={blurTotal}
          />
          <Text fw={700} fz={22} c="text.6" lh={1.1}>
            {currency}
          </Text>
        </Group>
      </Group>

      {proto.unattributed && (
        <Text fz={13} c="orange.5">
          {COPY.missingPart}
        </Text>
      )}

      <Button
        fullWidth
        color="primary.6"
        c={proto.canSave ? "textDark.6" : undefined}
        radius="md"
        leftSection={<Check size={16} />}
        disabled={!proto.canSave}
        styles={disabledButtonStyles}
        style={{ height: "2.75rem" }}
        onClick={proto.save}
      >
        {t("addService.save")}
      </Button>
      <Text fz={12} c="text.9" ta="center">
        {COPY.stub}
      </Text>
    </Stack>
  );
}
