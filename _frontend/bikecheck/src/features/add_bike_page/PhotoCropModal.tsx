// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Modal, Slider, Stack, Text } from "@mantine/core";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";
import { PHOTO_ASPECT, cropToFile } from "./photoCrop";

interface PhotoCropModalProps {
  // The uncropped file; null closes the modal.
  file: File | null;
  // The object URL for that file, owned by the caller so it is freed once.
  fileUrl: string | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Let users frame photos for the wide bike card slot.
export function PhotoCropModal({ file, fileUrl, onCancel, onConfirm }: PhotoCropModalProps): ReactElement {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  // Store crop coordinates in source-image pixels.
  const [area, setArea] = useState<Area | null>(null);
  const [isCutting, setIsCutting] = useState(false);

  // Reset framing controls for each selected photo.
  function reset(): void {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setArea(null);
  }

  function cancel(): void {
    reset();
    onCancel();
  }

  async function confirm(): Promise<void> {
    if (!file || !area) return;

    setIsCutting(true);
    try {
      onConfirm(await cropToFile(file, area));
      reset();
    } finally {
      setIsCutting(false);
    }
  }

  return (
    <Modal
      opened={file !== null}
      onClose={cancel}
      title={t("addBike.cropTitle")}
      centered
      fullScreen
      styles={{
        header: { backgroundColor: "var(--mantine-color-cards-7)" },
        title: { fontWeight: 700, color: "var(--mantine-color-text-6)" },
        body: { backgroundColor: "var(--mantine-color-cards-7)", padding: "1rem" },
        content: {
          backgroundColor: "var(--mantine-color-cards-7)",
          // A fullscreen modal starts at the very top of the window, which on Android is
          // where the status bar clock sits. The whole sheet drops below it.
          paddingTop: "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
        },
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="text.7">
          {t("addBike.cropBody")}
        </Text>

        {/* Provide a sized parent for the absolutely positioned cropper. */}
        <div style={{ position: "relative", width: "100%", height: "45dvh", backgroundColor: "#000000" }}>
          {fileUrl && (
            <Cropper
              image={fileUrl}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={PHOTO_ASPECT}
              // Keep the displayed crop area filled with image content.
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        {/* Provide one-handed and mouse-accessible zoom control. */}
        <Group gap="md" wrap="nowrap">
          <ZoomIn size={18} color="var(--mantine-color-text-7)" />
          <Slider
            value={zoom}
            onChange={setZoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            label={null}
            style={{ flex: 1 }}
          />
        </Group>

        <Group grow>
          <Button variant="outline" radius="sm" onClick={cancel} disabled={isCutting}>
            {t("action.back")}
          </Button>
          <Button radius="sm" onClick={confirm} loading={isCutting} disabled={area === null}>
            {t("addBike.cropConfirm")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
