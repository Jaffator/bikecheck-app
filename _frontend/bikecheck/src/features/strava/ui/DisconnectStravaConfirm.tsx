// Disconnecting asks twice: Strava's terms make us erase what came from it, and that cannot be undone.
import { useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDisconnectStrava } from "@/features/strava/strava.queries";

type Step = "disconnect" | "erase";

interface DisconnectStravaConfirmProps {
  opened: boolean;
  onClose: () => void;
  onDisconnected?: () => void;
}

export function DisconnectStravaConfirm({
  opened,
  onClose,
  onDisconnected,
}: DisconnectStravaConfirmProps): ReactElement {
  const { t } = useTranslation();
  const disconnect = useDisconnectStrava();
  const [step, setStep] = useState<Step>("disconnect");

  function close(): void {
    setStep("disconnect");
    // A failed attempt must not greet the next opening with its error.
    disconnect.reset();
    onClose();
  }

  function confirmErase(): void {
    disconnect.mutate(undefined, {
      onSuccess: () => {
        close();
        onDisconnected?.();
      },
    });
  }

  return (
    <>
      <ConfirmModal
        opened={opened && step === "disconnect"}
        onCancel={close}
        onConfirm={() => setStep("erase")}
        title={t("strava.disconnectConfirmTitle")}
        body={t("strava.disconnectConfirmBody")}
        cancelLabel={t("strava.disconnectConfirmCancel")}
        confirmLabel={t("strava.disconnectContinue")}
      />
      <ConfirmModal
        opened={opened && step === "erase"}
        onCancel={close}
        onConfirm={confirmErase}
        pending={disconnect.isPending}
        title={t("strava.disconnectEraseTitle")}
        body={disconnect.isError ? t("strava.disconnectFailed") : t("strava.disconnectEraseBody")}
        cancelLabel={t("strava.disconnectConfirmCancel")}
        confirmLabel={t("strava.disconnectErase")}
      />
    </>
  );
}
