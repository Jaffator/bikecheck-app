// Save, floating above the bottom of the screen for the whole sheet: the sheet grows with its
// sections, and the button that records it never scrolls away. The button stands alone on a
// fade of the page - no card round it.
import type { ReactElement } from "react";
import { Box, Button, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { disabledButtonStyles } from "@/features/add_bike_page/formStyles";
import { useKeyboardOffset } from "@/hooks/useKeyboardOffset";

interface SetupSaveBarProps {
  // Save is offered only once something on the sheet has changed.
  disabled: boolean;
  saving: boolean;
  saveFailed: boolean;
  onSave: () => void;
}

export function SetupSaveBar({ disabled, saving, saveFailed, onSave }: SetupSaveBarProps): ReactElement {
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
        // Rides above the software keyboard, which the webview does not resize for.
        transform: `translateY(-${keyboardOffset}px)`,
        display: "flex",
        justifyContent: "center",
        paddingBottom: "calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
        zIndex: 100,
        // Only the button takes taps; the rest of this strip is page underneath.
        pointerEvents: "none",
      }}
    >
      {/* Fades page content out under the button instead of cutting it off. */}
      <Box
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "8rem",
          background: "linear-gradient(to top, rgba(0, 0, 0, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: -1,
        }}
      />
      <Stack gap={6} w="70%" align="center" style={{ pointerEvents: "auto" }}>
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
          disabled={disabled}
          onClick={onSave}
        >
          {t("setup.save")}
        </Button>
      </Stack>
    </Box>
  );
}
