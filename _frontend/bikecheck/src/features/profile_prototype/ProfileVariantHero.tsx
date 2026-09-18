// PROTOTYPE #129 — variant 1 "Hero": the owner as a hero card (big avatar, name, badge,
// button on the same line, the figures underneath), then the bikes as full photo cards
// the way the garage draws them — minus badges, minus health, one mono line.
import type { ReactElement } from "react";
import { Box, Divider, Group, Paper, Stack, Text } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { BikePhoto } from "@/features/bikes/ui/BikePhoto";
import { PersonAvatar } from "./FollowButton";
import { ProfileLocked } from "./ProfileLocked";
import { bikeLine, garageFigures } from "./profile.figures";
import { OffNotice, OwnerAction, VisibilityBadge } from "./ProfileShared";
import type { ProfileView } from "./profile.model";
import { EYEBROW, PANEL } from "./shared";

interface Props {
  view: Exclude<ProfileView, { kind: "missing" }>;
  openBike: (id: number) => void;
}

export function ProfileVariantHero({ view, openBike }: Props): ReactElement {
  const { person } = view;
  const owner = view.kind === "garage" && view.owner;
  const garage = view.kind === "garage" ? view.garage : null;

  return (
    <Stack gap="md" px={8} pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {owner && person.visibility === "OFF" && <OffNotice />}

      <Paper radius="lg" p="md" style={PANEL}>
        <Stack gap="md">
          <Group gap="sm" wrap="nowrap" align="center">
            <PersonAvatar person={person} size={64} />
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text fw={700} fz={18} c="text.6" lineClamp={1} lh={1.2}>
                {person.name}
              </Text>
              <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
                @{person.handle}
              </Text>
              <VisibilityBadge visibility={person.visibility} />
            </Stack>
            <OwnerAction person={person} owner={owner} />
          </Group>

          {garage && (
            <>
              <Divider color="var(--color-border-subtle)" />
              <Group gap="lg" wrap="nowrap" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
                {garageFigures(garage).map((figure) => (
                  <Stack key={figure.label} gap={2} style={{ flexShrink: 0 }}>
                    <Text {...EYEBROW}>{figure.label}</Text>
                    <Text className="font-mono" fz={17} fw={600} c="text.6" lh={1.1}>
                      {figure.value}
                    </Text>
                  </Stack>
                ))}
              </Group>
              <Text className="font-mono" fz={11} c="var(--color-text-dim)">
                Aktualizováno {garage.updated}
              </Text>
            </>
          )}
        </Stack>
      </Paper>

      {view.kind === "locked" && <ProfileLocked person={person} relation={view.relation} />}

      {garage &&
        garage.bikes.map((bike, index) => (
          <Paper
            key={bike.id}
            radius="lg"
            role="button"
            tabIndex={0}
            onClick={() => openBike(bike.id)}
            className="active:scale-[0.985]"
            style={{
              overflow: "hidden",
              backgroundColor: "var(--mantine-color-cards-6)",
              border: "1px solid var(--mantine-color-cards-5)",
              boxShadow: "var(--elev-hero)",
              transition: "transform 0.12s ease",
              cursor: "pointer",
            }}
          >
            <BikePhoto imageUrl={bike.photo} title={`${bike.name} ${bike.model}`} subtitle={bike.chips.join(" · ")} titleSize={20} />
            <Group justify="space-between" wrap="nowrap" px="md" py="sm">
              <Text className="font-mono" fz={13} tt="uppercase" c="text.6" lts="0.02em" lineClamp={1}>
                {bikeLine(garage, index)}
              </Text>
              <Box style={{ display: "flex", flexShrink: 0 }}>
                <ChevronRight size={16} color="var(--color-text-dim)" />
              </Box>
            </Group>
          </Paper>
        ))}
    </Stack>
  );
}
