// PROTOTYPE #129 — throwaway. One bike on somebody's profile at /users/:handle/:bikeId:
// the layout of #120 (hero, Setup card, build, history) in the app's tokens, sections only
// where the owner shares them. The variants differ in where the owner sits as the way
// back to the garage: the header title itself over a transparent header (1 and 3), or an
// eyebrow inside the hero card under a solid header (2).
import { useEffect, type ReactElement } from "react";
import { Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Clock, Gauge, Wrench } from "lucide-react";
import { IoLogoWebComponent } from "react-icons/io5";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";

import { useHeaderStore } from "@/store/store";
import { PersonAvatar } from "./FollowButton";
import type { Person } from "./people";
import { partCount, type MockBike, type MockGarage } from "./profile.mock";
import { useBikeView } from "./profile.model";
import { ComponentsPanel, HistorySection, SetupCard } from "./ProfileBikeSections";
import { formatKm, UNDER_TRANSPARENT_HEADER } from "./profile.figures";
import { OffNotice, OwnerTitle, ProfileUnavailable } from "./ProfileShared";
import { usePrototypeStore } from "./prototype.store";

// The owner as the way back: mini avatar, name, handle. Drawn once, placed per variant.
function OwnerLink({ person, onBack, onDark = false }: { person: Person; onBack: () => void; onDark?: boolean }): ReactElement {
  return (
    <UnstyledButton onClick={onBack} style={{ display: "block", minWidth: 0 }}>
      <Group gap={6} wrap="nowrap">
        <ChevronLeft size={16} color={onDark ? "var(--mantine-color-text-6)" : "var(--color-text-dim)"} style={{ flexShrink: 0 }} />
        <PersonAvatar person={person} size={22} />
        <Text fz={13} fw={600} c="text.6" lineClamp={1}>
          {person.name}
        </Text>
        <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
          · @{person.handle}
        </Text>
      </Group>
    </UnstyledButton>
  );
}

function Metric({ icon, value }: { icon: ReactElement; value: string }): ReactElement {
  return (
    <Group gap={6} wrap="nowrap">
      {icon}
      <Text className="font-mono" fz={13} c="text.6" lineClamp={1}>
        {value}
      </Text>
    </Group>
  );
}

function Hero({ bike, garage, eyebrow }: { bike: MockBike; garage: MockGarage; eyebrow?: ReactElement }): ReactElement {
  return (
    <Paper
      radius="lg"
      style={{
        overflow: "hidden",
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage: "var(--card-glow)",
        border: "none",
        boxShadow: "var(--elev-hero)",
      }}
    >
      <BikePhoto imageUrl={bike.photo} title={`${bike.name} ${bike.model}`} subtitle={null} titleSize={24} showCaption={false} />
      <Stack gap={8} p="md">
        {eyebrow}
        <Stack gap={2} style={{ minWidth: 0 }}>
          <Text fw={700} fz={24} c="text.6" lh={1.2} lineClamp={1}>
            {bike.name} {bike.model}
          </Text>
          <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lineClamp={1}>
            {bike.chips.join(" · ")}
          </Text>
        </Stack>
        {/* Distance and saddle time always; parts and services only while the section goes out. */}
        <Group gap="md" wrap="wrap">
          <Metric icon={<Gauge size={14} color="var(--mantine-color-text-8)" />} value={formatKm(bike.km)} />
          <Metric icon={<Clock size={14} color="var(--mantine-color-text-8)" />} value={`${bike.hours} h`} />
          {garage.sections.components && <Metric icon={<IoLogoWebComponent size={14} color="var(--mantine-color-text-8)" />} value={`${partCount(bike)} dílů`} />}
          {garage.sections.history && <Metric icon={<Wrench size={14} color="var(--mantine-color-text-8)" />} value={`${bike.services.length} servisů`} />}
        </Group>
      </Stack>
    </Paper>
  );
}

export function UserProfileBike(): ReactElement {
  const { handle = "", bikeId = "" } = useParams();
  const navigate = useNavigate();
  const view = useBikeView(handle, Number(bikeId));
  const variant = usePrototypeStore((state) => state.variant);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const setHeaderTransparent = useHeaderStore((state) => state.setHeaderTransparent);

  const person = view.kind === "bike" ? view.person : null;
  const back = (): void => {
    void navigate(`/users/${handle}`);
  };

  // Variants 1 and 3 put the owner in the header, over the photo; variant 2 keeps @handle there.
  useEffect(() => {
    const onPhoto = variant !== "2" && person !== null;
    setHeaderTransparent(onPhoto);
    setTitleSlot(
      onPhoto ? (
        <OwnerTitle person={person} onClick={back} />
      ) : (
        <Text fw={700} size="lg" c="text.6" className="font-mono">
          @{handle}
        </Text>
      ),
    );
    return () => {
      setTitleSlot(null);
      setHeaderTransparent(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setTitleSlot, setHeaderTransparent, handle, variant, person?.handle, person?.name]);

  if (view.kind === "missing") return <ProfileUnavailable />;
  const { bike, garage, owner } = view;
  const ownerPerson = view.person;

  const sections = (
    <>
      {garage.sections.setup && <SetupCard bike={bike} garage={garage} />}
      {garage.sections.components && <ComponentsPanel bike={bike} />}
      {garage.sections.history && <HistorySection bike={bike} garage={garage} />}
    </>
  );

  const bottom = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

  if (variant !== "2") {
    return (
      <Stack gap="md" px={8} pt={UNDER_TRANSPARENT_HEADER} pb={bottom}>
        {owner && ownerPerson.visibility === "OFF" && <OffNotice />}
        <Hero bike={bike} garage={garage} />
        {sections}
      </Stack>
    );
  }

  return (
    <Stack gap="md" px={8} pt="md" pb={bottom}>
      {owner && ownerPerson.visibility === "OFF" && <OffNotice />}
      <Hero bike={bike} garage={garage} eyebrow={variant === "2" ? <OwnerLink person={ownerPerson} onBack={back} /> : undefined} />
      {sections}
    </Stack>
  );
}
