// Where the question is typed. Same material as the tab bar, pinned above it for the whole
// screen - see docs/ui/pinned-action-bar.md, with the tab bar's own height added to the gap
// because this is a tabbed route and the two would otherwise stack.
import type { CSSProperties, ReactElement } from "react";
import { ActionIcon, Box, Group, Stack, Text, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { QUESTION_MAX_LENGTH } from "../aiChat.api";
import type { ChatErrorReason } from "../aiChat.types";

// Clears the footer pill, written the way the FAB writes the same gap.
const TAB_BAR_CLEARANCE =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 0.5rem)";

const SEND_BUTTON_SIZE = 38;

// The field draws on the pill rather than on a box of its own.
const FIELD_STYLES = {
  input: {
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-text-9)",
  } as CSSProperties,
};

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  // A turn is already on the wire; a second one is not started while it is.
  running: boolean;
  failed: ChatErrorReason | null;
}

export function ChatComposer({ value, onChange, onSend, running, failed }: ChatComposerProps): ReactElement {
  const { t } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const empty = value.trim().length === 0;

  return (
    <Box
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Rides above the software keyboard, which the webview does not resize for.
        transform: `translateY(-${keyboardOffset}px)`,
        display: "flex",
        justifyContent: "center",
        paddingBottom: TAB_BAR_CLEARANCE,
        zIndex: 100,
        // Only the bar itself takes taps; the rest of this strip is thread underneath.
        pointerEvents: "none",
      }}
    >
      {/* Fades the thread out under the bar instead of cutting it off. */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "8rem",
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <Stack
        gap={6}
        w="92%"
        px="md"
        py="sm"
        className="rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md"
        style={{
          pointerEvents: "auto",
          boxShadow: "0 6px 20px color-mix(in srgb, var(--mantine-color-text-6) 15%, transparent)",
        }}
      >
        {/* The failure belongs beside the button that failed, not in thread the bar covers. */}
        {failed !== null && (
          <Text fz={13} c="red.5">
            {t(failed === "timeout" ? "chat.timeout" : "chat.failed")}
          </Text>
        )}
        <Group gap={8} wrap="nowrap" align="flex-end">
          <Textarea
            variant="unstyled"
            aria-label={t("chat.question")}
            placeholder={t("chat.placeholder")}
            value={value}
            autosize
            minRows={1}
            maxRows={4}
            maxLength={QUESTION_MAX_LENGTH}
            className="flex-1"
            styles={FIELD_STYLES}
            onChange={(event) => onChange(event.currentTarget.value)}
          />
          <ActionIcon
            size={SEND_BUTTON_SIZE}
            radius="xl"
            color="primary.6"
            c="textDark.6"
            aria-label={t("chat.send")}
            disabled={empty || running}
            onClick={onSend}
          >
            <Send size={18} />
          </ActionIcon>
        </Group>
      </Stack>
    </Box>
  );
}
