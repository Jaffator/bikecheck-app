// The one act on the chat page that is not a question. Hard deletion, so it is asked for
// first - the standard confirmation dialog, as a bike, a service or a report is deleted with.
import { useState, type ReactElement } from "react";
import { ActionIcon, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDeleteChatThread } from "../aiChat.queries";

const ICON_SIZE = 18;

interface ClearThreadButtonProps {
  // A turn is on the wire. It is saved on the server whatever happens here, so it would land
  // in a thread the user has just emptied - the act waits until the answer is in.
  disabled: boolean;
}

export function ClearThreadButton({ disabled }: ClearThreadButtonProps): ReactElement {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const remove = useDeleteChatThread();

  return (
    <>
      <ActionIcon
        variant="subtle"
        color="gray"
        radius="xl"
        size="lg"
        aria-label={t("chat.clear")}
        disabled={disabled}
        onClick={() => setAsking(true)}
      >
        <Trash2 size={ICON_SIZE} />
      </ActionIcon>

      <ConfirmModal
        opened={asking}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          remove.mutate(undefined, { onSuccess: () => setAsking(false) });
        }}
        title={t("chat.clearConfirmTitle")}
        body={t("chat.clearConfirmBody")}
        cancelLabel={t("chat.clearConfirmCancel")}
        confirmLabel={t("chat.clearConfirmAction")}
        pending={remove.isPending}
      >
        {/* A deletion that failed leaves the dialog standing: the thread is still there, so
            the answer belongs where the question was asked. */}
        {remove.isError && (
          <Text fz={13} c="red.5">
            {t("chat.clearFailed")}
          </Text>
        )}
      </ConfirmModal>
    </>
  );
}
