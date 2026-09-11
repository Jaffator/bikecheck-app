// Where the question is typed. Pinned above the tab bar (docs/ui/pinned-action-bar.md), with the
// bar's height added to the gap so the two do not stack.
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { ActionIcon, Box, Group, Stack, Text, Textarea } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { QUESTION_MAX_LENGTH } from "../chat.api";
import type { ChatFailure } from "../useChatTurn";

// Clears the footer pill, written the way the FAB writes the same gap - with a wider gap of
// its own at the end, so the composer does not read as sitting on the tab bar.
const TAB_BAR_CLEARANCE =
  "calc(4rem + 0.4rem + 0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)) + 1.5rem)";

const SEND_BUTTON_SIZE = 34;

// The pill is the send button plus this much above and below it - a fifth off the height the
// theme's `xs` padding gave it, with the button left at its own size.
const PILL_PADDING_Y = 6;

// The field draws on the pill rather than on a box of its own.
const FIELD_STYLES = {
  input: {
    color: "var(--mantine-color-text-6)",
    "--input-placeholder-color": "var(--mantine-color-text-9)",
    // Mantine's own vertical padding sits the text off the middle of the row and makes the
    // row taller than the send button. The pill owns that padding, so the field gives it up.
    paddingTop: 0,
    paddingBottom: 0,
    minHeight: 0,
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
  // The bike bar, which rides directly above the pill so the subject is read where the
  // question is typed.
  chips?: ReactNode;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  running,
  failed,
  actions,
  chips,
}: ChatComposerProps): ReactElement {
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
        flexDirection: "column",
        alignItems: "center",
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
          height: "12rem",
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.90), transparent)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {chips !== undefined && (
        // The same width as the pill, so the two read as one bar.
        <Box w="92%" style={{ pointerEvents: "auto" }}>
          {chips}
        </Box>
      )}
      <Stack
        gap={6}
        w="92%"
        pl="md"
        // The send button sits nearer the edge than the plus does, so the row reads as
        // running into it rather than ending short of the pill.
        pr={10}
        py={PILL_PADDING_Y}
        // A turn on the wire lights the pill - the glow orbits it, see global.css.
        className={`rounded-3xl border border-gray-720 bg-cards-600/30 backdrop-blur-md chat-composer-pill ${running ? "chat-composer-waiting" : ""}`}
        style={{ pointerEvents: "auto" }}
      >
        {/* The waiting glow, drawn on the pill's outline - see global.css. Two nodes: the arc is
            masked, so the glow it casts has to be filtered a level above it. */}
        <Box className="chat-composer-glow" aria-hidden>
          <Box className="chat-composer-orbit" />
        </Box>
        {/* The failure belongs beside the button that failed, not in thread the bar covers. */}
        {failed !== null && (
          <Text fz={13} c="red.5">
            {failed.reason === "budget"
              ? t("chat.budget", { time: retryTime(failed.retryAt, i18n.language) })
              : t(failed.reason === "timeout" ? "chat.timeout" : "chat.failed")}
          </Text>
        )}
        {/* Centred rather than bottom-aligned: with one line of question the button reads as
            sitting low on the pill otherwise. */}
        <Group gap={8} wrap="nowrap" align="center">
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
            color={disabled ? "gray.7" : "blue.6"}
            c={disabled ? "gray.5" : "textDark.6"}
            aria-label={t("chat.send")}
            disabled={disabled}
            onClick={onSend}
            style={{ opacity: disabled ? 0.2 : 1, transition: "opacity 120ms ease, background-color 120ms ease" }}
          >
            <div className="mr-0.5 mt-0.5">
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
