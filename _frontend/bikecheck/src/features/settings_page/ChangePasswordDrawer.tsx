// Changing the password of a rider who is already signed in: the old password is the proof
// of identity, so there is no mail and no reset link. A Google account never gets here — it
// has no password, and the row that opens this is not drawn for it.
import { useState, type ReactElement } from "react";
import { Button, PasswordInput, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ResponsiveSheet } from "@/components/ResponsiveSheet";
import { ApiError } from "@/api/client";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { useChangePassword } from "@/features/users/users.queries";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";

// The same layer the profile's edit sheet takes; only one of them is ever open.
const DRAWER_Z_INDEX = 320;

// What registration asks for, no stricter (CreateUserDto, MinLength(8)).
const MIN_PASSWORD_LENGTH = 8;

interface ChangePasswordDrawerProps {
  opened: boolean;
  onClose: () => void;
}

// Remounting the body on each opening is what discards the typed passwords: nothing that
// was entered survives a close, and a second attempt starts from three empty fields.
export function ChangePasswordDrawer(props: ChangePasswordDrawerProps): ReactElement {
  return <ChangePasswordBody key={props.opened ? "open" : "closed"} {...props} />;
}

function ChangePasswordBody({ opened, onClose }: ChangePasswordDrawerProps): ReactElement {
  const { t } = useTranslation();
  const change = useChangePassword();
  const keyboardOffset = useKeyboardOffset();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  // Errors are only shown once there is something to judge, so an untouched field is not
  // scolded for being empty.
  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = repeat.length > 0 && repeat !== next;
  const submittable =
    current.length > 0 && next.length >= MIN_PASSWORD_LENGTH && repeat === next && !change.isPending;

  function submit(): void {
    if (!submittable) return;
    change.mutate({ currentPassword: current, newPassword: next }, { onSuccess: onClose });
  }

  return (
    <ResponsiveSheet
      opened={opened}
      onClose={onClose}
      desktop="modal"
      zIndex={DRAWER_Z_INDEX}
      title={t("profile.changePasswordTitle")}
      styles={{
        content: {
          height: "auto",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
          maxHeight: `calc(88dvh - ${String(keyboardOffset)}px)`,
        },
        body: { paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="md">
        <PasswordInput
          label={t("profile.currentPassword")}
          styles={inputStyles}
          value={current}
          autoComplete="current-password"
          onChange={(event) => setCurrent(event.currentTarget.value)}
        />

        <PasswordInput
          label={t("profile.newPassword")}
          styles={inputStyles}
          value={next}
          autoComplete="new-password"
          onChange={(event) => setNext(event.currentTarget.value)}
          error={tooShort ? t("auth.passwordTooShort") : undefined}
        />

        <PasswordInput
          label={t("profile.newPasswordRepeat")}
          styles={inputStyles}
          value={repeat}
          autoComplete="new-password"
          onChange={(event) => setRepeat(event.currentTarget.value)}
          error={mismatch ? t("profile.passwordsDoNotMatch") : undefined}
        />

        {/* Other devices stop working the moment this succeeds; say so before it does. */}
        <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {t("profile.changePasswordHint")}
        </Text>

        {/* The sheet stays open on failure, so a mistyped current password can be corrected
            without typing the new one again. */}
        {change.isError && (
          <Text fz={13} c="red">
            {t(failureKey(change.error))}
          </Text>
        )}

        <Button variant="filled" radius="md" loading={change.isPending} disabled={!submittable} onClick={submit}>
          {t("profile.changePassword")}
        </Button>
      </Stack>
    </ResponsiveSheet>
  );
}

// A 401 that survives the client's refresh-and-replay is the typed current password being
// wrong, not an expired session — an expired one is refreshed and the request replayed.
function failureKey(error: unknown): string {
  if (error instanceof ApiError && error.status === 401) return "profile.passwordWrongCurrent";
  return "profile.passwordChangeFailed";
}
