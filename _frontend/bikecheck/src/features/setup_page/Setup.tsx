// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { Group, Skeleton, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useBike } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useBikeComponents, useUpdateBikeComponent } from "@/features/components/components.queries";
import { mountedSuspension } from "@/features/setup/dialBrand";
import { useCurrentUser } from "@/features/users/users.queries";
import type { TirePressureUnit } from "@/features/users/users.types";
import { useDeleteSetupProfile, useSaveSetupProfile, useSetupProfiles } from "@/features/setup/setup.queries";
import type { SetupProfile } from "@/features/setup/setup.types";
import type { DialKind } from "@/features/setup/dial.types";
import { isSetupDirty, toSetupForm, toSetupPayload, type SetupFormValues, type SetupSuspension } from "@/features/setup/setupForm";
import { SetupProfileChips } from "@/features/setup/ui/SetupProfileChips";
import { SetupProfileForm } from "@/features/setup/ui/SetupProfileForm";
import { SetupProfileMenu } from "@/features/setup/ui/SetupProfileMenu";
import { SetupProfileNameDrawer } from "@/features/setup/ui/SetupProfileNameDrawer";
import { SetupSaveBar } from "@/features/setup/ui/SetupSaveBar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useHeaderStore } from "@/store/store";
import { useScrollIntoViewOnFocus } from "@/hooks/useScrollIntoViewOnFocus";

// The pinned bar floats over the page, so the last field needs room to scroll clear of it.
const BAR_CLEARANCE = "5rem";

// The name sheet, when it is open: naming a new profile (blank or a copy) or renaming one.
type NameSheet = { mode: "create"; copy: boolean } | { mode: "rename"; profile: SetupProfile };

// The numbers one bike is ridden at, read and written through its Setup Profiles. One
// profile is read at a time; the bike shows an unsaved default when it has none yet - it
// "begins with one" as a promise of the screen, not a row (ADR 0029).
export function Setup(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const bikeId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { data: bike, isLoading: bikeLoading, isError: bikeError } = useBike(bikeId);
  const { data: profiles, isLoading: profilesLoading, isError: profilesError } = useSetupProfiles(bikeId);
  const { data: user } = useCurrentUser();
  // The build is read only to pick which knobs to draw; if it fails, the generic ones stand in.
  const { data: components, isLoading: componentsLoading } = useBikeComponents(bikeId);
  const save = useSaveSetupProfile();
  const remove = useDeleteSetupProfile();
  const updateComponent = useUpdateBikeComponent();
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const setHeaderOnBack = useHeaderStore((state) => state.setOnBack);
  // Keep focused fields above the pinned bar and keyboard.
  const formRef = useScrollIntoViewOnFocus<HTMLDivElement>("[data-fixed-footer]");

  // Only what the owner has changed. The rest is read off the profile, so a save that comes
  // back from the server is what the form goes on showing.
  const [edits, setEdits] = useState<Partial<SetupFormValues>>({});
  // Which profile is read; null falls back to the oldest, or to the unsaved default.
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // What waits for the owner to agree to lose their typing: leaving, or switching profile.
  const [pendingDiscard, setPendingDiscard] = useState<(() => void) | null>(null);
  const [nameSheet, setNameSheet] = useState<NameSheet | null>(null);
  const [deleting, setDeleting] = useState<SetupProfile | null>(null);

  // The account's unit; the user is always loaded behind the auth gate, bar is only a type guard.
  const unit: TirePressureUnit = user?.tire_pressure_unit ?? "bar";
  const profile = profiles?.find((item) => item.id === selectedId) ?? profiles?.[0] ?? null;
  // An Archived Bike is a frozen record: readable, and written to by nothing.
  const archived = bike?.is_deleted === true;
  const fork = mountedSuspension(components, "Fork");
  const shock = mountedSuspension(components, "Shock");

  // Single or dual adjusters is a property of the part, so the switch writes to the part and
  // holds across every profile of the bike.
  const setDual = (section: SetupSuspension, kind: DialKind, dual: boolean): void => {
    const part = section === "fork" ? fork : shock;
    if (!part) return;
    const fields = kind === "rebound" ? { dual_rebound: dual } : { dual_compression: dual };
    updateComponent.mutate({ id: part.id, bikeId, fields });
  };

  const baseline = useMemo(() => toSetupForm(profile, unit), [profile, unit]);
  const values: SetupFormValues = { ...baseline, ...edits };
  const dirty = !archived && isSetupDirty(values, baseline);

  // The header names the bike, not the screen: the owner is dialling in this machine.
  useEffect(() => {
    if (!bike) return;
    setTitleSlot(
      <Text fw={700} size="lg" c="text.6" lineClamp={1}>
        {bikeTitle(bike)}
      </Text>,
    );
    return () => setTitleSlot(null);
  }, [bike, setTitleSlot]);

  // Back returns to the detail the tile was tapped on; a deep link has no history to walk.
  function leave(): void {
    if (location.key === "default") {
      navigate(`/bikes/${String(bikeId)}`, { replace: true });
      return;
    }
    navigate(-1);
  }

  // Anything that would cost the owner what they typed is asked about first.
  function whenClean(action: () => void): void {
    if (dirty) {
      setPendingDiscard(() => action);
      return;
    }
    action();
  }

  // Keep the registered handler current without repeated registration.
  const backRef = useRef<() => void>(() => {});
  useEffect(() => {
    backRef.current = (): void => whenClean(leave);
  });

  // Leaving with unsaved numbers is asked about, for the header arrow and the Android
  // hardware button alike.
  useEffect(() => {
    setHeaderOnBack(() => backRef.current());
    return () => setHeaderOnBack(null);
  }, [setHeaderOnBack]);

  function set<K extends keyof SetupFormValues>(key: K, value: SetupFormValues[K]): void {
    setEdits((current) => ({ ...current, [key]: value }));
  }

  // Reading another profile drops the edits: they were typed against this one.
  function show(profileId: number | null): void {
    setEdits({});
    setSelectedId(profileId);
  }

  function select(profileId: number): void {
    if (profileId === profile?.id) return;
    whenClean(() => show(profileId));
  }

  // A new profile opens as soon as it exists, so a copy is switched to at once.
  function openCreate(copy: boolean): void {
    whenClean(() => setNameSheet({ mode: "create", copy }));
  }

  function onNamed(saved: SetupProfile): void {
    setNameSheet(null);
    if (nameSheet?.mode === "create") show(saved.id);
  }

  // The neighbour takes over from a deleted profile: the older one, else the younger, else
  // the unsaved default when the last one goes (ADR 0029).
  function confirmDelete(): void {
    if (deleting === null || profiles === undefined) return;
    const index = profiles.findIndex((item) => item.id === deleting.id);
    const fallback = profiles[index - 1] ?? profiles[index + 1] ?? null;
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null);
        show(fallback?.id ?? null);
      },
    });
  }

  // The first Save creates the profile under its default name; every later one rewrites it.
  function submit(): void {
    save.mutate(
      {
        bikeId,
        profileId: profile?.id ?? null,
        name: profile?.name ?? t("setup.defaultProfileName"),
        data: toSetupPayload(values, unit),
      },
      // The cache already holds what was saved, so dropping the edits changes nothing on screen.
      { onSuccess: (saved) => show(saved.id) },
    );
  }

  if (bikeLoading || profilesLoading || componentsLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        <Skeleton h={14} w="30%" radius="sm" />
        <Skeleton h={140} radius="lg" />
        <Skeleton h={200} radius="lg" />
      </Stack>
    );
  }

  if (bikeError || !bike) {
    return (
      <Text m="md" c="red">
        {t("bikes.loadFailed")}
      </Text>
    );
  }

  if (profilesError || profiles === undefined) {
    return (
      <Text m="md" c="red">
        {t("setup.loadFailed")}
      </Text>
    );
  }

  return (
    <>
      <Stack
        gap="md"
        px="md"
        pt="md"
        pb={`calc(${archived ? "2rem" : BAR_CLEARANCE} + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))`}
        ref={formRef}
      >
        {/* Which profile this sheet is, and the others it can be switched to. It holds at the
            top of the screen while the sheet scrolls, so a profile is a tap away from anywhere
            on it. The offset is the app header's height - see AppLayout. */}
        <Group
          gap="xs"
          wrap="nowrap"
          align="center"
          py={6}
          mt={-6}
          style={{
            position: "sticky",
            top: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
            zIndex: 2,
            backgroundColor: "var(--mantine-color-background-9)",
          }}
        >
          <SetupProfileChips
            profiles={profiles}
            selectedId={profile?.id ?? null}
            onSelect={select}
            onCreate={() => openCreate(false)}
            readOnly={archived}
          />
          {/* Only a saved profile has anything to rename, copy or delete. */}
          {!archived && profile !== null && (
            <SetupProfileMenu
              onRename={() => setNameSheet({ mode: "rename", profile })}
              onDuplicate={() => openCreate(true)}
              onDelete={() => setDeleting(profile)}
            />
          )}
        </Group>

        <SetupProfileForm
          values={values}
          onChange={set}
          unit={unit}
          hasFork={bike.has_front_suspension}
          hasShock={bike.has_rear_suspension}
          fork={fork}
          shock={shock}
          onDualChange={setDual}
          readOnly={archived}
        />
      </Stack>

      {/* An Archived Bike takes no new numbers, so the bar is absent rather than disabled. */}
      {!archived && <SetupSaveBar disabled={!dirty} saving={save.isPending} saveFailed={save.isError} onSave={submit} />}

      {/* Leaving or switching costs the owner what they typed, so it is asked rather than assumed. */}
      <ConfirmModal
        opened={pendingDiscard !== null}
        onCancel={() => setPendingDiscard(null)}
        onConfirm={() => {
          const action = pendingDiscard;
          setPendingDiscard(null);
          action?.();
        }}
        title={t("setup.discardTitle")}
        body={t("setup.discardBody")}
        cancelLabel={t("setup.keepEditing")}
        confirmLabel={t("setup.discard")}
      />

      <SetupProfileNameDrawer
        opened={nameSheet !== null}
        onClose={() => setNameSheet(null)}
        bikeId={bikeId}
        profile={nameSheet?.mode === "rename" ? nameSheet.profile : null}
        copySource={profile}
        copyByDefault={nameSheet?.mode === "create" && nameSheet.copy}
        onSaved={onNamed}
      />

      {/* A profile is rewritten in place with no history behind it, so deleting one is final. */}
      <ConfirmModal
        opened={deleting !== null}
        onCancel={() => {
          setDeleting(null);
          // A failure shown here belongs to this asking, not the next one.
          remove.reset();
        }}
        onConfirm={confirmDelete}
        title={t("setup.deleteTitle", { name: deleting?.name ?? "" })}
        body={t(deleting !== null && profiles.length === 1 ? "setup.deleteLastBody" : "setup.deleteBody")}
        cancelLabel={t("setup.cancel")}
        confirmLabel={t("setup.delete")}
        pending={remove.isPending}
      >
        {/* A deletion that failed leaves the dialog standing: the profile is still there. */}
        {remove.isError && (
          <Text fz={13} c="red.5">
            {t("setup.deleteFailed")}
          </Text>
        )}
      </ConfirmModal>
    </>
  );
}
