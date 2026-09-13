// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { Button, Group, NumberInput, Skeleton, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useBike, useBikeFormOptions, useUpdateBike } from "@/features/bikes/bikes.queries";
import { BikeSpecification, FieldLabel } from "@/features/add_bike_page/BikeSpecification";
import { PhotoCropModal } from "@/features/add_bike_page/PhotoCropModal";
import {
  SUSPENSION_FLAGS,
  toSpecificationValues,
  type BikeSpecificationValues,
} from "@/features/add_bike_page/bikeSpecification.types";
import { autosizeInputStyles, disabledButtonStyles, inputStyles } from "@/features/add_bike_page/formStyles";
import { PHOTO_ASPECT } from "@/features/add_bike_page/photoCrop";
import type { Bike, UpdateBikePayload } from "@/features/bikes/bikes.types";

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

// Corrects a bike that was described once in the wizard and frozen ever since. The wizard's
// own step two, with brand and model above it: nothing here scrapes
// or assembles components.
export function BikeEdit(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: bike, isLoading, isError } = useBike(Number(id));
  const { data: formOptions } = useBikeFormOptions();
  const save = useUpdateBike();

  // Only what the owner has changed. The rest is read off the bike, so the form is filled
  // in on its first render rather than one render later.
  const [edits, setEdits] = useState<Partial<FormValues>>({});
  // The photo waiting to be framed, and the framed one that will be sent.
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const [photoToCropUrl, setPhotoToCropUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Object URLs are the caller's to free, and there are two of them here.
  useEffect(() => {
    return () => {
      if (photoToCropUrl) URL.revokeObjectURL(photoToCropUrl);
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoToCropUrl, photoUrl]);

  function pickPhoto(file: File | null): void {
    if (!file) return;
    setPhotoToCrop(file);
    setPhotoToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  function confirmCrop(cropped: File): void {
    setPhoto(cropped);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(cropped);
    });
    cancelCrop();
  }

  function cancelCrop(): void {
    setPhotoToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPhotoToCrop(null);
  }

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

  // What the bike says, with whatever the owner has typed over the top of it.
  const values: FormValues = { ...toForm(bike), ...edits };

  // One save: the fields and the photo go together, so a stored photo can never outlive an
  // unsaved form.
  const submit = (): void => {
    save.mutate(
      { id: bike.id, bike: toPayload(values), image: photo },
      { onSuccess: () => navigate(`/bikes/${String(bike.id)}`) },
    );
  };

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setEdits((current) => ({ ...current, [key]: value }));
  };

  // The header of step two names the bike as the lookup did; here it follows the brand and
  // model typed above it.
  const displayName = `${values.bike_brand} ${values.bike_model}`.trim();

  const identity = (
    <>
      <Stack gap={4}>
        <FieldLabel>{t("addBike.brand")}</FieldLabel>
        <TextInput
          placeholder={t("addBike.brandPlaceholder")}
          radius="sm"
          styles={inputStyles}
          value={values.bike_brand}
          onChange={(event) => set("bike_brand", event.currentTarget.value)}
          error={values.bike_brand.trim() === "" ? t("bikeEdit.brandRequired") : undefined}
        />
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("addBike.model")}</FieldLabel>
        <TextInput
          placeholder={t("addBike.modelPlaceholder")}
          radius="sm"
          styles={inputStyles}
          value={values.bike_model}
          onChange={(event) => set("bike_model", event.currentTarget.value)}
        />
      </Stack>
    </>
  );

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
        fallbackName={displayName}
        year={values.year === null ? null : String(values.year)}
        categories={formOptions?.bikeTypes ?? []}
        values={values}
        onChange={(field, value) => setEdits((current) => ({ ...current, [field]: value }))}
        photoUrl={photoUrl ?? bike.image_url}
        onPickPhoto={pickPhoto}
        mileageLabel={t("bikeEdit.startingMileage")}
        identity={identity}
      />

      <Stack gap={4}>
        <FieldLabel>{t("addBike.year")}</FieldLabel>
        <NumberInput
          placeholder={t("addBike.yearPlaceholder")}
          radius="sm"
          styles={inputStyles}
          value={values.year ?? ""}
          min={1900}
          max={new Date().getFullYear() + 1}
          onChange={(value) => set("year", value === "" ? null : Number(value))}
        />
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("bikeEdit.frameMaterial")}</FieldLabel>
        <TextInput
          placeholder={t("bikeEdit.frameMaterialPlaceholder")}
          radius="sm"
          styles={inputStyles}
          value={values.frame_material}
          onChange={(event) => set("frame_material", event.currentTarget.value)}
        />
      </Stack>

      {/* A tenth of a kilogram is exactly what an owner quotes about a road bike. */}
      <Stack gap={4}>
        <FieldLabel>{t("bikeEdit.weight")}</FieldLabel>
        <NumberInput
          placeholder={t("bikeEdit.weightPlaceholder")}
          radius="sm"
          styles={inputStyles}
          value={values.bike_weight_kg ?? ""}
          min={0}
          max={999}
          step={0.1}
          decimalScale={2}
          onChange={(value) => set("bike_weight_kg", value === "" ? null : Number(value))}
        />
      </Stack>

      <Stack gap={4}>
        <FieldLabel>{t("bikeEdit.description")}</FieldLabel>
        <Textarea
          placeholder={t("bikeEdit.descriptionPlaceholder")}
          radius="sm"
          styles={autosizeInputStyles}
          autosize
          minRows={2}
          maxRows={5}
          value={values.description}
          onChange={(event) => set("description", event.currentTarget.value)}
        />
      </Stack>

      {save.isError && (
        <Text fz={13} c="red.5">
          {t("bikeEdit.saveFailed")}
        </Text>
      )}

      <Group gap="sm" wrap="nowrap" mt="xs">
        <Button
          variant="outline"
          color="var(--mantine-color-cards-2)"
          radius="md"
          onClick={() => navigate(-1)}
          style={{ flex: 1 }}
        >
          {t("bikeEdit.cancel")}
        </Button>
        <Button
          color="primary.6"
          radius="md"
          styles={disabledButtonStyles}
          loading={save.isPending}
          disabled={values.bike_brand.trim() === ""}
          onClick={submit}
          style={{ flex: 1 }}
        >
          {t("bikeEdit.save")}
        </Button>
      </Group>

      <PhotoCropModal file={photoToCrop} fileUrl={photoToCropUrl} onCancel={cancelCrop} onConfirm={confirmCrop} />
    </Stack>
  );
}
