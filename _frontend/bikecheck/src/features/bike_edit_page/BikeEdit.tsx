// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from "react";
import { Button, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useBike, useBikeFormOptions, useUpdateBike } from "@/features/bikes/bikes.queries";
import { BikeSpecification } from "@/features/add_bike_page/BikeSpecification";
import { PhotoCropModal } from "@/features/add_bike_page/PhotoCropModal";
import {
  SUSPENSION_FLAGS,
  toSpecificationValues,
  type BikeSpecificationValues,
} from "@/features/add_bike_page/bikeSpecification.types";
import { PHOTO_ASPECT } from "@/features/add_bike_page/photoCrop";
import { ConfirmModal } from "@/components/ConfirmModal";
import { GroupedList } from "@/components/GroupedList";
import { NoteRow } from "@/components/NoteRow";
import { NumberRow } from "@/components/NumberRow";
import { TextRow } from "@/components/TextRow";
import { useHeaderStore } from "@/store/store";
import type { Bike, UpdateBikePayload } from "@/features/bikes/bikes.types";

// A text button in the header; disabled it fades rather than turning into a grey block.
const DONE_STYLES = {
  root: { "--mantine-color-disabled": "transparent", fontSize: 15, fontWeight: 600 } as CSSProperties,
};

// What the form holds while it is being edited: the wizard's step-two values, and the
// identity the wizard took from the lookup. Everything is a string or null, so a cleared
// field is telling the truth rather than falling back to a zero.
interface FormValues extends BikeSpecificationValues {
  bike_brand: string;
  bike_model: string;
  year: number | null;
  frame_material: string;
  bike_weight_kg: number | null;
  description: string;
}

function toForm(bike: Bike): FormValues {
  return {
    ...toSpecificationValues(bike),
    bike_brand: bike.bike_brand,
    bike_model: bike.bike_model ?? "",
    year: bike.year,
    frame_material: bike.frame_material ?? "",
    bike_weight_kg: bike.bike_weight_kg,
    description: bike.description ?? "",
  };
}

function trimmed(value: string): string | undefined {
  const text = value.trim();
  return text === "" ? undefined : text;
}

// What goes to the server. A field the owner emptied is left out rather than sent blank, so
// the update writes what was typed and never an empty string over a name.
function toPayload(values: FormValues): UpdateBikePayload {
  const suspension = values.suspension === null ? undefined : SUSPENSION_FLAGS[values.suspension];
  const bikeSize = values.frameSize === "other" ? trimmed(values.sizeLength) : (values.frameSize ?? undefined);

  return {
    bikename: trimmed(values.bikeName),
    bike_brand: values.bike_brand.trim(),
    bike_model: trimmed(values.bike_model),
    year: values.year ?? undefined,
    bike_type: values.category ?? undefined,
    has_front_suspension: suspension?.front,
    has_rear_suspension: suspension?.rear,
    ebike: values.ebike,
    bike_size: bikeSize,
    wheel_size: values.wheelSize ?? undefined,
    total_km: values.currentMileage.trim() === "" ? undefined : Number(values.currentMileage),
    frame_material: trimmed(values.frame_material),
    bike_weight_kg: values.bike_weight_kg ?? undefined,
    description: trimmed(values.description),
  };
}

// An edit typed back to what the bike says is no edit, so leaving then asks nothing.
function hasEdits(original: FormValues, edits: Partial<FormValues>): boolean {
  return (Object.keys(edits) as (keyof FormValues)[]).some((key) => edits[key] !== original[key]);
}

interface PhotoCrop {
  // The photo waiting to be framed, and the framed one that will be sent.
  toCrop: File | null;
  toCropUrl: string | null;
  photo: File | null;
  photoUrl: string | null;
  pick: (file: File | null) => void;
  confirm: (cropped: File) => void;
  cancel: () => void;
}

function usePhotoCrop(): PhotoCrop {
  const [toCrop, setToCrop] = useState<File | null>(null);
  const [toCropUrl, setToCropUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Object URLs are the caller's to free, and there are two of them here.
  useEffect(() => {
    return () => {
      if (toCropUrl) URL.revokeObjectURL(toCropUrl);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [toCropUrl, photoUrl]);

  function pick(file: File | null): void {
    if (!file) return;
    setToCrop(file);
    setToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function confirm(cropped: File): void {
    setPhoto(cropped);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(cropped);
    });
    cancel();
  }

  function cancel(): void {
    setToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setToCrop(null);
  }

  return { toCrop, toCropUrl, photo, photoUrl, pick, confirm, cancel };
}

function DoneButton({ disabled, loading, onClick }: { disabled: boolean; loading: boolean; onClick: () => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Button
      variant="subtle"
      color="primary.6"
      radius="md"
      px="sm"
      disabled={disabled}
      loading={loading}
      onClick={onClick}
      styles={DONE_STYLES}
    >
      {t("bikeEdit.done")}
    </Button>
  );
}

// The wizard's step two with brand and model above it, for a bike frozen since the wizard;
// nothing here scrapes or assembles components.
export function BikeEdit(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: formOptions } = useBikeFormOptions();

  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        <Skeleton radius="md" style={{ aspectRatio: PHOTO_ASPECT }} />
        <Skeleton h={36} radius="sm" />
        <Skeleton h={36} radius="sm" />
        <Skeleton h={36} radius="sm" />
      </Stack>
    );
  }

  if (isError || !bike) {
    return (
      <Text m="md" c="red">
        {t("bikes.loadFailed")}
      </Text>
    );
  }

  return <BikeEditForm bike={bike} categories={formOptions?.bikeTypes ?? []} />;
}

function BikeEditForm({ bike, categories }: { bike: Bike; categories: string[] }): ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const save = useUpdateBike();
  const crop = usePhotoCrop();
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);

  // Only what the owner has changed. The rest is read off the bike, so the form is filled
  // in on its first render rather than one render later.
  const [edits, setEdits] = useState<Partial<FormValues>>({});
  const [discarding, setDiscarding] = useState(false);

  // What the bike says, with whatever the owner has typed over the top of it.
  const original = toForm(bike);
  const values: FormValues = { ...original, ...edits };
  const canSave = values.bike_brand.trim() !== "";
  const dirty = crop.photo !== null || hasEdits(original, edits);

  function leave(): void {
    if (location.key === "default") navigate(`/bikes/${String(bike.id)}`);
    else navigate(-1);
  }

  // One save: the fields and the photo go together, so a stored photo can never outlive an
  // unsaved form.
  function submit(): void {
    save.mutate(
      { id: bike.id, bike: toPayload(values), image: crop.photo },
      { onSuccess: () => navigate(`/bikes/${String(bike.id)}`) },
    );
  }

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]): void {
    setEdits((current) => ({ ...current, [key]: value }));
  }

  // Keep the registered handlers current without repeated registration.
  const backRef = useRef<() => void>(() => {});
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    backRef.current = (): void => {
      if (dirty) setDiscarding(true);
      else leave();
    };
    submitRef.current = submit;
  });

  // Back asks before it throws edits away, for the header arrow and the Android button alike.
  useEffect(() => {
    setHeaderOnBack(() => backRef.current());
    return () => setHeaderOnBack(null);
  }, [setHeaderOnBack]);

  useEffect(() => {
    setActionSlot(<DoneButton disabled={!canSave} loading={save.isPending} onClick={() => submitRef.current()} />);
    return () => setActionSlot(null);
  }, [setActionSlot, canSave, save.isPending]);

  const identity = [
    <TextRow
      key="brand"
      label={t("addBike.brand")}
      placeholder={t("bikeEdit.brandRequired")}
      invalid={!canSave}
      value={values.bike_brand}
      onChange={(text) => set("bike_brand", text)}
    />,
    <TextRow
      key="model"
      label={t("addBike.model")}
      placeholder={t("addBike.modelPlaceholder")}
      value={values.bike_model}
      onChange={(text) => set("bike_model", text)}
    />,
    <NumberRow
      key="year"
      label={t("addBike.year")}
      placeholder={t("addBike.yearPlaceholder")}
      min={1900}
      max={new Date().getFullYear() + 1}
      value={values.year}
      onChange={(year) => set("year", year)}
    />,
  ];

  return (
    <Stack
      gap="lg"
      px="md"
      pt="md"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
      bg="background.9"
      mih="100dvh"
    >
      <BikeSpecification
        bike={null}
        fallbackName={`${values.bike_brand} ${values.bike_model}`.trim()}
        year={values.year === null ? null : String(values.year)}
        categories={categories}
        values={values}
        onChange={(field, value) => setEdits((current) => ({ ...current, [field]: value }))}
        photoUrl={crop.photoUrl ?? bike.image_url}
        onPickPhoto={crop.pick}
        mileageLabel={t("bikeEdit.startingMileage")}
        identity={identity}
      />

      <GroupedList title={t("bikeEdit.detailsGroup")}>
        <TextRow
          label={t("bikeEdit.frameMaterial")}
          placeholder={t("bikeEdit.frameMaterialPlaceholder")}
          value={values.frame_material}
          onChange={(text) => set("frame_material", text)}
        />
        {/* A tenth of a kilogram is exactly what an owner quotes about a road bike. */}
        <NumberRow
          label={t("bikeEdit.weight")}
          placeholder={t("bikeEdit.weightPlaceholder")}
          min={0}
          max={999}
          step={0.1}
          decimalScale={2}
          value={values.bike_weight_kg}
          onChange={(weight) => set("bike_weight_kg", weight)}
        />
        <NoteRow
          label={t("bikeEdit.notes")}
          emptyLabel={t("bikeEdit.addNotes")}
          placeholder={t("bikeEdit.descriptionPlaceholder")}
          value={values.description}
          onChange={(note) => set("description", note)}
        />
      </GroupedList>

      {save.isError && (
        <Text fz={13} c="red.5">
          {t("bikeEdit.saveFailed")}
        </Text>
      )}

      <PhotoCropModal file={crop.toCrop} fileUrl={crop.toCropUrl} onCancel={crop.cancel} onConfirm={crop.confirm} />

      <ConfirmModal
        opened={discarding}
        onCancel={() => setDiscarding(false)}
        onConfirm={() => {
          setDiscarding(false);
          leave();
        }}
        title={t("bikeEdit.discardTitle")}
        body={t("bikeEdit.discardBody")}
        cancelLabel={t("bikeEdit.keepEditing")}
        confirmLabel={t("bikeEdit.discard")}
      />
    </Stack>
  );
}
