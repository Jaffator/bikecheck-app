// The share drawer: one segmented control decides the state, under it the preview, the
// address (Public only - in the app people go by name), what goes out and which bikes.
// Every change saves at once; the handle saves on leaving the field.
import { useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Center, Drawer, Group, Image, Loader, SegmentedControl, Stack, Text, UnstyledButton } from "@mantine/core";
import { Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useBikes } from "@/features/bikes/bikes.queries";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { handleError, handleErrorFromApi, profileUrl } from "../handle";
import { useMyProfile, useSaveSharing } from "../profile.queries";
import {
  PROFILE_VISIBILITIES,
  type HandleErrorCode,
  type Profile,
  type ProfileVisibility,
  type SharedBikeChange,
  type UpdateProfilePayload,
} from "../profile.types";
import { VISIBILITY_HINT_KEY, VISIBILITY_LABEL_KEY } from "../profileVisibility";
import { HandleField } from "./HandleField";
import { ShareSwitchRow } from "./ShareSwitchRow";

// Above the page it opens from, matching the settings drawers.
const DRAWER_Z_INDEX = 320;
const THUMB_SIZE = 40;

// docs/ui/card-surface.md: a panel, as the bike detail draws its cards - no hairline.
const PANEL: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  boxShadow: "var(--elev-panel)",
  borderRadius: "1rem",
};

// The grabber rides on Mantine's own header, so the close button stays the stock one.
const GRABBER_HEADER =
  "relative pt-14 before:content-[''] before:absolute before:top-2 before:left-1/2 before:-translate-x-1/2 before:w-9 before:h-1 before:rounded-full before:bg-[var(--color-border-subtle)]";

interface SectionProps {
  title: string;
  children: ReactNode;
}

function Section({ title, children }: SectionProps): ReactElement {
  return (
    <Box px="md" pt="sm" pb={4} style={PANEL}>
      <Text className="font-mono" fz={11} fw={400} tt="uppercase" lts="0.08em" c="var(--color-text-dim)">
        {title}
      </Text>
      {children}
    </Box>
  );
}

interface ShareDrawerProps {
  opened: boolean;
  onClose: () => void;
}

export function ShareDrawer({ opened, onClose }: ShareDrawerProps): ReactElement {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const { data: bikes } = useBikes();
  const navigate = useNavigate();
  const location = useLocation();
  // The form remounts per opening to start from what is saved, so the sheet mounts closed
  // and opens on the next frame or Mantine skips the slide (docs/conventions/drawers.md).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!opened) {
      setVisible(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(frame);
  }, [opened]);

  // Android's back gesture dismisses this rather than the page under it.
  useOverlayBack(opened, onClose);

  // Closing pushes nothing, so back from the preview lands where the drawer was opened.
  // Opened over the preview itself, it only closes - the page is already there.
  function preview(handle: string): void {
    onClose();
    const path = `/users/${handle}`;
    if (location.pathname !== path) void navigate(path);
  }

  return (
    <Drawer
      opened={visible}
      onClose={onClose}
      position="bottom"
      radius="lg"
      zIndex={DRAWER_Z_INDEX}
      title={
        <Group gap={8} wrap="nowrap">
          <Share2 size={18} color="var(--mantine-color-text-6)" />
          <span>{t("sharing.title")}</span>
        </Group>
      }
      classNames={{ header: GRABBER_HEADER }}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { backgroundColor: "var(--mantine-color-cards-6)", height: "auto", maxHeight: "92dvh" },
        header: { backgroundColor: "var(--mantine-color-cards-6)" },
        // Cards run closer to the sheet's edges than plain rows would.
        body: { paddingInline: 8, paddingBottom: "calc(3rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))" },
        title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
      }}
    >
      {profile && bikes ? (
        <ShareForm profile={profile} bikes={bikes} onPreview={preview} />
      ) : (
        <Center py="xl">
          <Loader type="oval" color="primary.6" />
        </Center>
      )}
    </Drawer>
  );
}

interface ShareSwitches {
  components: boolean;
  setup: boolean;
  history: boolean;
  costs: boolean;
}

function sharePayload(shares: ShareSwitches): UpdateProfilePayload {
  return {
    share_components: shares.components,
    share_setup: shares.setup,
    share_history: shares.history,
    share_costs: shares.costs,
  };
}

interface ShareFormProps {
  profile: Profile;
  bikes: Bike[];
  onPreview: (handle: string) => void;
}

function ShareForm({ profile, bikes, onPreview }: ShareFormProps): ReactElement {
  const { t } = useTranslation();
  const save = useSaveSharing();
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile.visibility);
  const [handle, setHandle] = useState(profile.handle ?? profile.suggested_handle ?? "");
  const [shares, setShares] = useState<ShareSwitches>({
    components: profile.share_components,
    setup: profile.share_setup,
    history: profile.share_history,
    costs: profile.share_costs,
  });
  const [sharedBikes, setSharedBikes] = useState<Record<number, boolean>>(() =>
    Object.fromEntries(bikes.map((bike) => [bike.id, bike.is_shared])),
  );
  // What the server refused the last save for - a taken handle is only ever known there.
  const [refusedFor, setRefusedFor] = useState<HandleErrorCode | null>(null);
  const [confirmingRename, setConfirmingRename] = useState(false);

  const off = visibility === "OFF";
  const error = handleError(handle) ?? refusedFor;
  const renaming = profile.handle !== null && handle !== profile.handle;
  // The preview shows what is saved, not what is typed: an unsaved handle has no page.
  const savedHandle = profile.handle;
  // Works in every state, Off included: the preview is the one check a Followers-only
  // profile has. Gated like Kopírovat - a handle the rule refuses has no page.
  const previewEnabled = savedHandle !== null && error === null;
  // Copy and Open likewise: only a saved Public profile has a page the link opens.
  const savedUrl = profile.visibility === "PUBLIC" && savedHandle !== null ? profileUrl(profile.public_origin, savedHandle) : null;

  function changeHandle(next: string): void {
    setRefusedFor(null);
    setHandle(next);
  }

  // The first save must carry a handle (the row needs one); a rename only lands via saveHandle.
  function persist(overrides: UpdateProfilePayload, changedBikes: SharedBikeChange[] = []): void {
    const carriesHandle = !renaming && error === null;
    save.mutate(
      {
        profile: { ...(carriesHandle ? { handle } : {}), visibility, ...sharePayload(shares), ...overrides },
        bikes: changedBikes,
      },
      { onError: (failure) => setRefusedFor(handleErrorFromApi(failure)) },
    );
  }

  function changeVisibility(next: ProfileVisibility): void {
    setVisibility(next);
    if (next === "PUBLIC") {
      persist({ visibility: next });
      return;
    }
    // Leaving Public hides the field, so whatever was typed there is dropped, not kept invisibly.
    const saved = profile.handle ?? profile.suggested_handle ?? "";
    changeHandle(saved);
    persist({ visibility: next, handle: saved });
  }

  function setShare(key: keyof ShareSwitches, checked: boolean): void {
    const next = { ...shares, [key]: checked };
    setShares(next);
    persist(sharePayload(next));
  }

  function setBikeShared(id: number, checked: boolean): void {
    setSharedBikes((current) => ({ ...current, [id]: checked }));
    persist({}, [{ id, is_shared: checked }]);
  }

  // A rename kills the old link the moment it lands, so it is asked about first.
  function saveHandle(): void {
    if (error !== null || handle === profile.handle) return;
    if (renaming) {
      setConfirmingRename(true);
      return;
    }
    persist({ handle });
  }

  function confirmRename(): void {
    setConfirmingRename(false);
    persist({ handle });
  }

  function cancelRename(): void {
    setConfirmingRename(false);
    setHandle(profile.handle ?? "");
  }

  return (
    <Stack gap="lg">
      <Stack gap={8}>
        {/* The one control that decides everything wears the accent. The theme paints every
            label dim, so the active one is forced dark by class. */}
        <SegmentedControl
          fullWidth
          withItemsBorders={false}
          color="primary.6"
          value={visibility}
          onChange={(value) => changeVisibility(value as ProfileVisibility)}
          data={PROFILE_VISIBILITIES.map((value) => ({ value, label: t(VISIBILITY_LABEL_KEY[value]) }))}
          classNames={{ label: "data-[active]:!text-black data-[active]:font-semibold" }}
          styles={{ indicator: { backgroundColor: "var(--mantine-color-primary-6)" } }}
        />
        <Text fz={13} c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
          {t(VISIBILITY_HINT_KEY[visibility])}
        </Text>
        <UnstyledButton
          disabled={!previewEnabled}
          onClick={savedHandle === null ? undefined : () => onPreview(savedHandle)}
          style={{ cursor: previewEnabled ? "pointer" : "default" }}
        >
          <Text fz={13} fw={600} c={previewEnabled ? "primary.5" : "text.9"}>
            {t("sharing.preview")}
          </Text>
        </UnstyledButton>
      </Stack>

      {/* The address is the web link and nothing else; without a Public profile there is none. */}
      {visibility === "PUBLIC" && (
        <Section title={t("sharing.sectionAddress")}>
          <HandleField
            handle={handle}
            onChange={changeHandle}
            onCommit={saveHandle}
            error={error}
            origin={profile.public_origin}
            savedUrl={savedUrl}
          />
        </Section>
      )}

      <Section title={t("sharing.sectionShares")}>
        <ShareSwitchRow
          first
          label={t("sharing.shareComponents")}
          hint={t("sharing.shareComponentsHint")}
          checked={shares.components}
          disabled={off}
          onChange={(checked) => setShare("components", checked)}
        />
        <ShareSwitchRow
          label={t("sharing.shareSetup")}
          hint={t("sharing.shareSetupHint")}
          checked={shares.setup}
          disabled={off}
          onChange={(checked) => setShare("setup", checked)}
        />
        <ShareSwitchRow
          label={t("sharing.shareHistory")}
          hint={t("sharing.shareHistoryHint")}
          checked={shares.history}
          disabled={off}
          onChange={(checked) => setShare("history", checked)}
        />
        {/* Costs only mean something with the history they belong to. */}
        {shares.history && (
          <ShareSwitchRow
            nested
            label={t("sharing.shareCosts")}
            hint={t("sharing.shareCostsHint")}
            checked={shares.costs}
            disabled={off}
            onChange={(checked) => setShare("costs", checked)}
          />
        )}
      </Section>

      <Section title={t("sharing.sectionBikes")}>
        {bikes.map((bike, index) => (
          <ShareSwitchRow
            key={bike.id}
            first={index === 0}
            label={bikeTitle(bike)}
            checked={sharedBikes[bike.id]}
            disabled={off}
            onChange={(checked) => setBikeShared(bike.id, checked)}
            leading={<BikeThumb bike={bike} dimmed={off || !sharedBikes[bike.id]} />}
          />
        ))}
        {bikes.length === 0 && (
          <Text py={8} fz={13} c="var(--color-text-dim)">
            {t("sharing.noBikes")}
          </Text>
        )}
      </Section>

      {save.isError && refusedFor === null && (
        <Text fz={13} c="red">
          {t("sharing.saveFailed")}
        </Text>
      )}

      <ConfirmModal
        opened={confirmingRename}
        onCancel={cancelRename}
        onConfirm={confirmRename}
        title={t("sharing.renameTitle")}
        body={t("sharing.renameBody", { handle: profile.handle ?? "" })}
        cancelLabel={t("sharing.renameCancel")}
        confirmLabel={t("sharing.renameConfirm")}
      />
    </Stack>
  );
}

interface BikeThumbProps {
  bike: Bike;
  dimmed: boolean;
}

function BikeThumb({ bike, dimmed }: BikeThumbProps): ReactElement {
  if (!bike.image_url) {
    return (
      <Box w={THUMB_SIZE} h={THUMB_SIZE} style={{ borderRadius: 6, backgroundColor: "var(--mantine-color-cards-5)", flexShrink: 0 }} />
    );
  }
  return (
    <Image
      src={bike.image_url}
      alt=""
      w={THUMB_SIZE}
      h={THUMB_SIZE}
      radius="sm"
      fit="cover"
      style={{ flexShrink: 0, opacity: dimmed ? 0.4 : 1 }}
    />
  );
}
