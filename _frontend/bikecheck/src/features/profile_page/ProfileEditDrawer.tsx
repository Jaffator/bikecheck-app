// The two things about the rider the app lets them correct: what they are called, and what
// they weigh. Everything else on the profile is read off a linked account.
import { useState, type ReactElement } from "react";
import { Button, Drawer, Stack, Text, NumberInput, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { useUpdateUser } from "@/features/users/users.queries";
import type { User } from "@/features/users/users.types";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// Above the profile page it sits on, matching the settings drawers.
const DRAWER_Z_INDEX = 320;

// A rider outside this range is a typo, not a rider.
const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 250;

interface ProfileEditDrawerProps {
  user: User;
  opened: boolean;
  onClose: () => void;
}

export function ProfileEditDrawer({ user, opened, onClose }: ProfileEditDrawerProps): ReactElement {
  const { t } = useTranslation();
  const save = useUpdateUser();
  // Only what the rider has typed; the rest is read off the user, so the form is filled in
  // on its first render rather than one render later.
  const [name, setName] = useState<string | null>(null);
  const [weight, setWeight] = useState<number | null | undefined>(undefined);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  const shownName = name ?? user.name;
  const shownWeight = weight === undefined ? user.weight_kg : weight;
  const nameEmpty = shownName.trim() === "";
  const weightOutOfRange = shownWeight !== null && (shownWeight < MIN_WEIGHT_KG || shownWeight > MAX_WEIGHT_KG);

  function submit(): void {
    save.mutate(
      {
        id: user.id,
        // A weight the rider cleared is left out rather than sent blank.
        data: { name: shownName.trim(), ...(shownWeight === null ? {} : { weight_kg: shownWeight }) },
      },
      { onSuccess: onClose },
    );
  }

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={DRAWER_Z_INDEX}
      title={t("profile.editTitle")}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto", maxHeight: "88dvh" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        body: { paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="md">
        <TextInput
          label={t("profile.name")}
          styles={inputStyles}
          value={shownName}
          onChange={(event) => setName(event.currentTarget.value)}
          error={nameEmpty ? t("profile.nameRequired") : undefined}
        />

        <Stack gap={4}>
          <NumberInput
            label={t("profile.weight")}
            placeholder={t("profile.weightPlaceholder")}
            styles={inputStyles}
            value={shownWeight ?? ""}
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            step={0.5}
            decimalScale={1}
            suffix=" kg"
            onChange={(value) => setWeight(value === "" ? null : Number(value))}
            error={weightOutOfRange ? t("profile.weightOutOfRange") : undefined}
          />
          {/* The rider is being asked for a number about their body; say what it buys them. */}
          <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("profile.weightHint")}
          </Text>
        </Stack>

        {/* The form stays open on failure, so nothing typed is lost. */}
        {save.isError && (
          <Text fz={13} c="red">
            {t("profile.saveFailed")}
          </Text>
        )}

        <Button
          variant="filled"
          radius="md"
          loading={save.isPending}
          disabled={nameEmpty || weightOutOfRange}
          onClick={submit}
        >
          {t("profile.save")}
        </Button>
      </Stack>
    </Drawer>
  );
}
