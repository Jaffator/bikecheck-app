// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useState, type ReactElement } from "react";
import { Button, Group, Image, NumberInput, Select, Skeleton, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ImagePlus } from "lucide-react";
import { useBike, useBikeFormOptions, useUpdateBike } from "../bikes/bikes.queries";
import { PhotoCropModal } from "../add_bike_page/PhotoCropModal";
import { FRAME_SIZES, WHEEL_SIZES } from "../add_bike_page/bikeSpecification.types";
import { autosizeInputStyles, dropdownProps, inputStyles } from "../add_bike_page/formStyles";
import { PHOTO_ASPECT } from "../add_bike_page/photoCrop";
import type { Bike, UpdateBikePayload } from "../bikes/bikes.types";

// What the form holds while it is being edited. Everything is a string or null, so a
// cleared field is telling the truth rather than falling back to a zero.
interface FormValues {
  bikename: string;
  bike_brand: string;
  bike_model: string;
  year: number | null;
  bike_type: string | null;
  bike_size: string | null;
  wheel_size: string | null;
  frame_material: string;
  bike_weight_kg: number | null;
  description: string;
}

// The frame sizes offered as chips in the wizard; "other" is a free-text escape there and
// has no meaning in a plain select, so it is dropped.
const FRAME_SIZE_OPTIONS = FRAME_SIZES.filter((size) => size !== "other");

function toForm(bike: Bike): FormValues {
  return {
    bikename: bike.bikename ?? "",
    bike_brand: bike.bike_brand,
    bike_model: bike.bike_model ?? "",
    year: bike.year,
    bike_type: bike.bike_type,
    bike_size: bike.bike_size,
    wheel_size: bike.wheel_size,
    frame_material: bike.frame_material ?? "",
    bike_weight_kg: bike.bike_weight_kg,
    description: bike.description ?? "",
  };
}

// What goes to the server. A field the owner emptied is left out rather than sent blank, so
// the update writes what was typed and never an empty string over a name.
function toPayload(values: FormValues): UpdateBikePayload {
  return {
    bikename: values.bikename.trim() === "" ? undefined : values.bikename.trim(),
    bike_brand: values.bike_brand.trim(),
    bike_model: values.bike_model.trim() === "" ? undefined : values.bike_model.trim(),
    year: values.year ?? undefined,
    bike_type: values.bike_type ?? undefined,
    bike_size: values.bike_size ?? undefined,
    wheel_size: values.wheel_size ?? undefined,
    frame_material: values.frame_material.trim() === "" ? undefined : values.frame_material.trim(),
    bike_weight_kg: values.bike_weight_kg ?? undefined,
    description: values.description.trim() === "" ? undefined : values.description.trim(),
  };
}

// Corrects a bike that was described once in the wizard and frozen ever since. A plain
// form, not a wizard: nothing here scrapes or assembles components.
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

  const shownPhoto = photoUrl ?? bike.image_url;

  return (
    <Stack
      gap="md"
      px="md"
      pt="md"
      pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
    >
      {/* The photo, and the one control that replaces it. */}
      <Stack gap="xs">
        {shownPhoto !== null ? (
          <Image
            src={shownPhoto}
            alt={values.bike_brand}
            radius="lg"
            style={{ aspectRatio: PHOTO_ASPECT, objectFit: "cover", backgroundColor: "#FFFFFF" }}
          />
        ) : (
          <Stack
            align="center"
            justify="center"
            bg="cards.7"
            style={{ aspectRatio: PHOTO_ASPECT, borderRadius: "var(--mantine-radius-lg)" }}
          >
            <ImagePlus size={28} color="var(--mantine-color-text-9)" />
          </Stack>
        )}

        <Button
          component="label"
          variant="outline"
          color="primary.5"
          radius="md"
          leftSection={<ImagePlus size={16} />}
          style={{ alignSelf: "flex-start" }}
        >
          {t("addBike.changePhoto")}
          <input
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => pickPhoto(event.currentTarget.files?.[0] ?? null)}
          />
        </Button>
      </Stack>

      <TextInput
        label={t("addBike.bikeName")}
        placeholder={t("addBike.bikeNamePlaceholder")}
        styles={inputStyles}
        value={values.bikename}
        onChange={(event) => set("bikename", event.currentTarget.value)}
      />

      <TextInput
        label={t("addBike.brand")}
        placeholder={t("addBike.brandPlaceholder")}
        styles={inputStyles}
        value={values.bike_brand}
        onChange={(event) => set("bike_brand", event.currentTarget.value)}
        error={values.bike_brand.trim() === "" ? t("bikeEdit.brandRequired") : undefined}
      />

      <TextInput
        label={t("addBike.model")}
        placeholder={t("addBike.modelPlaceholder")}
        styles={inputStyles}
        value={values.bike_model}
        onChange={(event) => set("bike_model", event.currentTarget.value)}
      />

      <NumberInput
        label={t("addBike.year")}
        placeholder={t("addBike.yearPlaceholder")}
        styles={inputStyles}
        value={values.year ?? ""}
        min={1900}
        max={new Date().getFullYear() + 1}
        onChange={(value) => set("year", value === "" ? null : Number(value))}
      />

      <Select
        label={t("bikeEdit.bikeType")}
        placeholder={t("bikeEdit.bikeTypePlaceholder")}
        comboboxProps={{ withinPortal: dropdownProps.withinPortal }}
        styles={{ ...inputStyles, ...dropdownProps.styles }}
        data={formOptions?.bikeTypes ?? []}
        value={values.bike_type}
        onChange={(value) => set("bike_type", value)}
        clearable
      />

      <Select
        label={t("addBike.frameSize")}
        placeholder={t("bikeEdit.notSet")}
        comboboxProps={{ withinPortal: dropdownProps.withinPortal }}
        styles={{ ...inputStyles, ...dropdownProps.styles }}
        data={[...FRAME_SIZE_OPTIONS]}
        value={values.bike_size}
        onChange={(value) => set("bike_size", value)}
        clearable
      />

      <Select
        label={t("addBike.wheelSize")}
        placeholder={t("bikeEdit.notSet")}
        comboboxProps={{ withinPortal: dropdownProps.withinPortal }}
        styles={{ ...inputStyles, ...dropdownProps.styles }}
        data={[...WHEEL_SIZES]}
        value={values.wheel_size}
        onChange={(value) => set("wheel_size", value)}
        clearable
      />

      <TextInput
        label={t("bikeEdit.frameMaterial")}
        placeholder={t("bikeEdit.frameMaterialPlaceholder")}
        styles={inputStyles}
        value={values.frame_material}
        onChange={(event) => set("frame_material", event.currentTarget.value)}
      />

      {/* A tenth of a kilogram is exactly what an owner quotes about a road bike. */}
      <NumberInput
        label={t("bikeEdit.weight")}
        placeholder={t("bikeEdit.weightPlaceholder")}
        styles={inputStyles}
        value={values.bike_weight_kg ?? ""}
        min={0}
        max={999}
        step={0.1}
        decimalScale={2}
        onChange={(value) => set("bike_weight_kg", value === "" ? null : Number(value))}
      />

      <Textarea
        label={t("bikeEdit.description")}
        placeholder={t("bikeEdit.descriptionPlaceholder")}
        styles={autosizeInputStyles}
        autosize
        minRows={2}
        maxRows={5}
        value={values.description}
        onChange={(event) => set("description", event.currentTarget.value)}
      />

      {save.isError && (
        <Text fz={13} c="red.5">
          {t("bikeEdit.saveFailed")}
        </Text>
      )}

      <Group gap="sm" wrap="nowrap" mt="xs">
        <Button variant="outline" color="text.8" radius="md" onClick={() => navigate(-1)} style={{ flex: 1 }}>
          {t("bikeEdit.cancel")}
        </Button>
        <Button
          color="primary.6"
          radius="md"
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
