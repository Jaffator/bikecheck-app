// PROTOTYPE for #337, never merged: the one-time bubble beside the element it explains.
import type { ReactElement } from "react";
import { Box, Button, Popover, Stack, Text } from "@mantine/core";
import { useIsDesktop } from "@/layout/breakpoints";
import { useHintStore } from "./prototypeStore";

interface HintBubbleProps {
  hintKey: string;
  text: string;
  // False holds the bubble back, so two never stand on one screen.
  when?: boolean;
  // A sheet's scrolling body clips a floating bubble, so there it stands in the flow.
  inSheet?: boolean;
  children: ReactElement;
}

function HintBody({ text, onDismiss }: { text: string; onDismiss: () => void }): ReactElement {
  return (
    <Stack gap="sm">
      <Text fz={14} lh="20px" c="text.6">
        {text}
      </Text>
      <Button size="compact-md" radius="md" c="textDark.6" style={{ alignSelf: "flex-end" }} onClick={onDismiss}>
        Rozumím
      </Button>
    </Stack>
  );
}

// Takes its own room under the element, so it covers nothing and nothing clips it.
function InlineHint({ text, onDismiss }: { text: string; onDismiss: () => void }): ReactElement {
  return (
    <Box pos="relative" mt={14} p="14px 16px" bg="cards.5" style={{ borderRadius: 12 }}>
      <Box
        pos="absolute"
        top={-6}
        left={20}
        w={12}
        h={12}
        bg="cards.5"
        style={{ transform: "rotate(45deg)" }}
      />
      <HintBody text={text} onDismiss={onDismiss} />
    </Box>
  );
}

export function HintBubble({ hintKey, text, when = true, inSheet = false, children }: HintBubbleProps): ReactElement {
  const beside = useIsDesktop();
  const seen = useHintStore((state) => state.seen.includes(hintKey));
  const enabled = useHintStore((state) => state.enabled);
  const dismiss = useHintStore((state) => state.dismiss);
  const opened = when && enabled && !seen;

  if (inSheet) {
    return (
      <Box>
        {children}
        {opened && <InlineHint text={text} onDismiss={() => dismiss(hintKey)} />}
      </Box>
    );
  }

  return (
    <Popover
      opened={opened}
      position={beside ? "right-start" : "bottom"}
      width={beside ? 280 : "target"}
      offset={10}
      withArrow
      arrowSize={12}
      arrowOffset={20}
      trapFocus={false}
      returnFocus={false}
      styles={{
        dropdown: {
          backgroundColor: "var(--mantine-color-cards-5)",
          border: "none",
          borderRadius: 12,
          boxShadow: "var(--elev-panel)",
          padding: "14px 16px",
        },
        arrow: { border: "none" },
      }}
    >
      <Popover.Target>
        <Box>{children}</Box>
      </Popover.Target>
      <Popover.Dropdown>
        <HintBody text={text} onDismiss={() => dismiss(hintKey)} />
      </Popover.Dropdown>
    </Popover>
  );
}
