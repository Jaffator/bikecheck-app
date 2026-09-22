// Save, which is present only while there is something to save: it slides up out of the foot
// of the screen the moment a number changes and leaves again once the change is recorded. The
// button stands alone on a fade of the page - no card round it.
import type { ReactElement } from "react";
import { Box, Button, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";
import { CONTENT_MAX_WIDTH } from "@/layout/contentWidth";

interface SetupSaveBarProps {
  // Nothing has changed: the bar waits off-screen rather than sitting there disabled.
  visible: boolean;
  saving: boolean;
  saveFailed: boolean;
  onSave: () => void;
}

export function SetupSaveBar({ visible, saving, saveFailed, onSave }: SetupSaveBarProps): ReactElement {
  const { t } = useTranslation();
  const keyboardOffset = useKeyboardOffset();

  return (
    <Box
      // Exposes the fixed footer to focus-scrolling hooks.
      data-fixed-footer
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Rides above the software keyboard, which the webview does not resize for; off-screen
        // entirely while there is nothing to save.
        transform: visible ? `translateY(-${keyboardOffset}px)` : "translateY(100%)",
        opacity: visible ? 1 : 0,
        transition: "transform 200ms ease, opacity 160ms ease",
        display: "flex",
        justifyContent: "center",
        // Matches the page gutter, so the button lines up with the cards it saves.
        paddingLeft: "1rem",
        paddingRight: "1rem",
        paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
        zIndex: 100,
        // Only the button takes taps, and only while it is on screen.
        pointerEvents: "none",
      }}
      aria-hidden={!visible}
    >
      {/* Fades page content out under the button instead of cutting it off. */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "10rem",
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      {/* In a browser it stays as wide as the cards it saves: the column less the gutter. */}
      <Stack gap={6} w="100%" maw={`calc(${CONTENT_MAX_WIDTH} - 2rem)`} align="center" style={{ pointerEvents: visible ? "auto" : "none" }}>
        {/* The failure belongs beside the button that failed. */}
        {saveFailed && (
          <Text fz={13} c="red.5">
            {t("setup.saveFailed")}
          </Text>
        )}
        <Button
          color="primary.6"
          radius="md"
          fullWidth
          h="2.5rem"
          styles={disabledButtonStyles}
          loading={saving}
          tabIndex={visible ? 0 : -1}
          onClick={onSave}
        >
          {t("setup.save")}
        </Button>
      </Stack>
    </Box>
  );
}
