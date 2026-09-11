// The plus beside the question field: everything the chat page can do that is not asking.
// One item for now - the thread is deleted from here, hard, so it is asked for first.
import { useState, type ReactElement } from "react";
import { ActionIcon, Menu, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDeleteChatThread } from "../chat.queries";

const ICON_SIZE = 18;
const BUTTON_SIZE = 38;

interface ChatActionsMenuProps {
  // Nothing is stored yet, so there is nothing to delete. The item stays listed and
  // disabled, the way the part menu teaches its rule rather than hiding it.
  canClear: boolean;
  // A turn is on the wire. It is saved on the server whatever happens here, so it would
  // land in a thread the user has just emptied - the act waits until the answer is in.
  disabled: boolean;
}

export function ChatActionsMenu({ canClear, disabled }: ChatActionsMenuProps): ReactElement {
  const { t } = useTranslation();
  const [asking, setAsking] = useState(false);
  const remove = useDeleteChatThread();

  return (
    <>
      {/* Opens upwards: the bar stands at the foot of the screen. */}
      <Menu position="top-start" radius="md" withinPortal zIndex={200}>
        <Menu.Target>
          <ActionIcon
            variant="transparent"
            color="text.6"
            radius="xl"
            size={BUTTON_SIZE}
            aria-label={t("chat.menu")}
            // Pulled out past the bar's own padding, so it sits at the pill's left edge.
            ml={-10}
            style={{ flexShrink: 0 }}
          >
            <Plus size={ICON_SIZE + 2} />
          </ActionIcon>
        </Menu.Target>

        {/* Wears the app's one dropdown surface - see the part row menu. */}
        <Menu.Dropdown
          bg="cards.6"
          p={8}
          style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
        >
          <Menu.Item
            color="red.5"
            py={12}
            fw={600}
            leftSection={<Trash2 size={ICON_SIZE} />}
            disabled={!canClear || disabled}
            onClick={() => setAsking(true)}
          >
            {t("chat.clear")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

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
