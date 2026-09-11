// Deleting an Account: the row and everything belonging to the rider, destroyed outright.
// There is no archive to fall back into, so the sheet says what disappears and asks for the
// account's email back before it will let the button be pressed (ADR 0028).
import { useEffect, useState, type ReactElement } from "react";
import { Button, Drawer, Group, Loader, Stack, Text, TextInput } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { fieldLabel, inputStyles } from "@/features/add_bike_page/formStyles";
import { useAccountDeletionSummary, useDeleteAccount } from "@/features/users/users.queries";
import type { AccountDeletionSummary } from "@/features/users/users.types";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { useOverlayBack } from "@/hooks/useOverlayBack";

// The same layer the profile's other sheets take; only one of them is ever open.
const DRAWER_Z_INDEX = 320;

// The wizard's field, with the label dimmed to sit quietly above the typed-back email.
const confirmInputStyles = {
  ...inputStyles,
  label: { ...fieldLabel, color: "var(--mantine-color-cards-4)" },
};

interface DeleteAccountDrawerProps {
  opened: boolean;
  onClose: () => void;
  email: string;
}

// Remounting the body on each opening is what discards the typed email: a sheet that was
// closed halfway through never reopens one keystroke from deleting the account.
export function DeleteAccountDrawer(props: DeleteAccountDrawerProps): ReactElement {
  return <DeleteAccountBody key={props.opened ? "open" : "closed"} {...props} />;
}

function DeleteAccountBody({ opened, onClose, email }: DeleteAccountDrawerProps): ReactElement {
  const { t } = useTranslation();
  const { data: summary, isLoading } = useAccountDeletionSummary(opened);
  const destroy = useDeleteAccount();
  const keyboardOffset = useKeyboardOffset();
  const [typedEmail, setTypedEmail] = useState("");

  // This body is remounted on each opening, and a Drawer that mounts already open skips
  // its enter transition. So it mounts closed and slides up on the next frame.
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!opened) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [opened]);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  // Exactly the account's own address, case and all — the same guard the bike's typed name
  // is, and just as much a guard for the hand rather than for the wire.
  const emailMatches = typedEmail === email;
  const submittable = emailMatches && !isLoading && !destroy.isPending;

  function submit(): void {
    if (!submittable) return;
    // Nothing to do on success: the session is dropped and the app lands on the login
    // screen, taking this sheet with it.
    destroy.mutate();
  }

  return (
    <Drawer
      opened={visible}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={DRAWER_Z_INDEX}
      title={t("profile.deleteAccountTitle")}
      // Opens the same way every other bottom sheet does.
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          backgroundColor: "var(--mantine-color-cards-6)",
          height: "auto",
          // Rides above the software keyboard, which the webview does not resize for.
          marginBottom: keyboardOffset,
          maxHeight: `calc(88dvh - ${String(keyboardOffset)}px)`,
        },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        body: { paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      <Stack gap="md">
        <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {t("profile.deleteAccountBody")}
        </Text>

        {/* What is counted is what goes. The numbers are read before the field is even
            offered, so nobody is asked to remember what the account holds. */}
        {isLoading || summary === undefined ? (
          <Group justify="center" py="md">
            <Loader size="sm" color="primary.6" />
          </Group>
        ) : (
          <Stack gap={8}>
            <DeletionCount label={t("profile.deleteAccountBikes")} value={summary.bikes} />
            <DeletionCount label={t("profile.deleteAccountRides")} value={summary.rides} />
            <DeletionCount label={t("profile.deleteAccountServices")} value={summary.services} />
            <DeletionCount label={t("profile.deleteAccountPublicReports")} value={summary.publicReports} />
          </Stack>
        )}

        {/* A link already handed to a buyer stops answering, which is worth saying before
            it happens rather than after. */}
        {hasLiveLinks(summary) && (
          <Text fz={12} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("profile.deleteAccountLinksHint")}
          </Text>
        )}

        <TextInput
          value={typedEmail}
          onChange={(event) => setTypedEmail(event.currentTarget.value)}
          placeholder={email}
          label={t("profile.deleteAccountTypeEmail")}
          styles={confirmInputStyles}
          inputMode="email"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
        />

        {/* The sheet stays open on failure, so a second attempt costs one tap. */}
        {destroy.isError && (
          <Text fz={13} c="red.5">
            {t("profile.deleteAccountFailed")}
          </Text>
        )}

        <Button
          color="red.5"
          radius="md"
          styles={{ root: { "--button-color": "black" } as React.CSSProperties }}
          loading={destroy.isPending}
          disabled={!submittable}
          onClick={submit}
        >
          {t("profile.deleteAccountConfirm")}
        </Button>
      </Stack>
    </Drawer>
  );
}

// One line of what disappears: what it is, and how much of it there is.
function DeletionCount({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text fz={14} c="text.6">
        {label}
      </Text>
      {/* A figure, so the mono face. */}
      <Text className="font-mono" fz={14} c="var(--color-text-dim)" style={{ letterSpacing: "0.02em" }}>
        {String(value)}
      </Text>
    </Group>
  );
}

// Whether anything outside the app is still reading this account.
function hasLiveLinks(summary: AccountDeletionSummary | undefined): boolean {
  return summary !== undefined && summary.publicReports > 0;
}
