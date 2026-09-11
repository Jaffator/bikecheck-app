// Where the question is typed. Pinned above the tab bar (docs/ui/pinned-action-bar.md), with the
// bar's height added to the gap so the two do not stack.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ActionIcon, Box, Group, Stack, Text, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { QUESTION_MAX_LENGTH } from "../aiChat.api";
import type { ChatFailure } from "../useChatTurn";

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
  failed: ChatFailure | null;
  // What the page hangs at the left of the bar - the plus and its menu.
  actions: ReactNode;
}

export function ChatComposer({ value, onChange, onSend, running, failed, actions }: ChatComposerProps): ReactElement {
  const { t, i18n } = useTranslation();
  const keyboardOffset = useKeyboardOffset();
  const empty = value.trim().length === 0;
  const disabled = empty || running;

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
          boxShadow: "0 2px 10px color-mix(in srgb, var(--mantine-color-text-6) 10%, transparent)",
        }}
      >
        {/* The failure belongs beside the button that failed, not in thread the bar covers. */}
        {failed !== null && (
          <Text fz={13} c="red.5">
            {failed.reason === "budget"
              ? t("chat.budget", { time: retryTime(failed.retryAt, i18n.language) })
              : t(failed.reason === "timeout" ? "chat.timeout" : "chat.failed")}
          </Text>
        )}
        <Group gap={8} wrap="nowrap" align="flex-end">
          {actions}
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
            color={disabled ? "gray.7" : "primary.6"}
            c={disabled ? "gray.5" : "textDark.6"}
            aria-label={t("chat.send")}
            disabled={disabled}
            onClick={onSend}
            style={{ opacity: disabled ? 0.2 : 1, transition: "opacity 120ms ease, background-color 120ms ease" }}
          >
            <div className="mr-[2px] mt-[1px]">
              <Send size={18} />
            </div>
          </ActionIcon>
        </Group>
      </Stack>
    </Box>
  );
}

// When the budget window frees up. Only the clock time: the window is a rolling day, so the
// moment is never more than a day away and the date would say nothing.
function retryTime(iso: string | null, language: string): string {
  if (iso === null) return "";

  return new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}
