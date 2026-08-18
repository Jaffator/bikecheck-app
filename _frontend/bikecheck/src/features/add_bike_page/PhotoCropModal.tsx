// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Group, Modal, Slider, Stack, Text } from "@mantine/core";
import Cropper, { type Area } from "react-easy-crop";
import { useTranslation } from "react-i18next";
import { ZoomIn } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import { PHOTO_ASPECT, cropToFile } from "./photoCrop";

interface PhotoCropModalProps {
  // The file as picked from the device, still uncropped. Null closes the modal:
  // there is nothing to frame until a photo is chosen.
  file: File | null;
  // The object URL for that file, owned by the caller so it is freed once.
  fileUrl: string | null;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Framing step between picking a photo and using it. A phone camera shoots
// 4:3 portrait, while the card shows a wide strip — without a say in the crop
// the bike ends up as a slice of its own photo.
export function PhotoCropModal({ file, fileUrl, onCancel, onConfirm }: PhotoCropModalProps): ReactElement {
  const { t } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  // Where the crop landed, in the source image's own pixels — the only form
  // the canvas cut can use.
  const [area, setArea] = useState<Area | null>(null);
  const [isCutting, setIsCutting] = useState(false);

  // Each photo is framed from scratch; the previous one's zoom and offset mean
  // nothing for a different image.
  function reset(): void {
    setCrop({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setArea(null);
  }

  function cancel(): void {
    tapFeedback();
    reset();
    onCancel();
  }

  async function confirm(): Promise<void> {
    if (!file || !area) return;

    tapFeedback();
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
        content: { backgroundColor: "var(--mantine-color-cards-7)" },
      }}
    >
      <Stack gap="lg">
        <Text size="sm" c="text.7">
          {t("addBike.cropBody")}
        </Text>

        {/* ----------- The frame ----------- */}
        {/* Cropper positions itself absolutely, so it needs a sized parent. */}
        <div style={{ position: "relative", width: "100%", height: "45dvh", backgroundColor: "#000000" }}>
          {fileUrl && (
            <Cropper
              image={fileUrl}
              crop={crop}
              zoom={zoom}
              minZoom={MIN_ZOOM}
              maxZoom={MAX_ZOOM}
              aspect={PHOTO_ASPECT}
              // The card contains rather than crops, so the whole framed area
              // is what will be seen — restricting keeps it filled with photo.
              restrictPosition
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>

        {/* ----------- Zoom ----------- */}
        {/* Pinch works on the frame itself; the slider is for one-handed use and
            for anyone on a mouse. */}
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

        {/* ----------- Confirm ----------- */}
        <Group grow>
          <Button variant="default" radius="sm" onClick={cancel} disabled={isCutting}>
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
