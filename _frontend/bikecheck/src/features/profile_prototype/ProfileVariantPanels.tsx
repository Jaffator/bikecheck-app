// PROTOTYPE #129 — variant 2 "Panely": the owner as one compact row (the row /follows
// draws, #128), the figures as a strip of tiles, and the bikes as hairline rows inside one
// panel — thumbnail, name, chips, mono line. Dense; no photo carries the screen.
import { Fragment, type ReactElement } from "react";
import { Box, Divider, Group, Image, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight, Gauge } from "lucide-react";
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

const THUMB_W = 84;
const THUMB_H = 42;

export function ProfileVariantPanels({ view, openBike }: Props): ReactElement {
  const { person } = view;
  const owner = view.kind === "garage" && view.owner;
  const garage = view.kind === "garage" ? view.garage : null;

  return (
    <Stack gap="md" px={8} pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {owner && person.visibility === "OFF" && <OffNotice />}

      <Paper radius="lg" px="md" py="sm" style={PANEL}>
        <Group gap="sm" wrap="nowrap">
          <PersonAvatar person={person} size={44} />
          <Stack gap={0} style={{ flex: 1, minWidth: 0 }}>
            <Text fw={600} fz={15} c="text.6" lineClamp={1}>
              {person.name}
            </Text>
            <Group gap={8} wrap="nowrap">
              <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
                @{person.handle}
              </Text>
              <VisibilityBadge visibility={person.visibility} size={11} />
            </Group>
          </Stack>
          <OwnerAction person={person} owner={owner} size="xs" />
        </Group>
      </Paper>

      {view.kind === "locked" && <ProfileLocked person={person} relation={view.relation} />}

      {garage && (
        <>
          <Paper radius="lg" px="md" py="sm" style={PANEL}>
            <Group justify="space-between" wrap="nowrap" gap="sm">
              {garageFigures(garage).map((figure, index) => (
                <Fragment key={figure.label}>
                  {index > 0 && <Divider orientation="vertical" color="var(--color-border-subtle)" />}
                  <Stack gap={2} style={{ minWidth: 0 }}>
                    <Text {...EYEBROW}>{figure.label}</Text>
                    <Text className="font-mono" fz={15} fw={600} c="text.6" lh={1.1} style={{ whiteSpace: "nowrap" }}>
                      {figure.value}
                    </Text>
                  </Stack>
                </Fragment>
              ))}
            </Group>
          </Paper>

          <Paper radius="lg" p="md" pt="sm" style={PANEL}>
            <Stack gap={4}>
              <Text {...EYEBROW}>Kola · {garage.bikes.length}</Text>
              {garage.bikes.map((bike, index) => (
                <Fragment key={bike.id}>
                  {index > 0 && <Divider color="var(--color-border-subtle)" />}
                  <UnstyledButton onClick={() => openBike(bike.id)} py={10} w="100%" className="active:opacity-70">
                    <Group gap="sm" wrap="nowrap">
                      <Box
                        style={{
                          width: THUMB_W,
                          height: THUMB_H,
                          borderRadius: 8,
                          overflow: "hidden",
                          flexShrink: 0,
                          backgroundColor: bike.photo ? "#FFFFFF" : "var(--mantine-color-cards-7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {bike.photo ? <Image src={bike.photo} alt="" w="100%" h="100%" fit="cover" /> : <Gauge size={18} color="var(--mantine-color-text-9)" />}
                      </Box>
                      <Stack gap={1} style={{ flex: 1, minWidth: 0 }}>
                        <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                          {bike.name} {bike.model}
                        </Text>
                        <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
                          {bike.chips.join(" · ")}
                        </Text>
                        <Text className="font-mono" fz={11} tt="uppercase" c="var(--color-text-dim)" lts="0.04em" lineClamp={1}>
                          {bikeLine(garage, index)}
                        </Text>
                      </Stack>
                      <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
                    </Group>
                  </UnstyledButton>
                </Fragment>
              ))}
            </Stack>
          </Paper>

          <Text className="font-mono" fz={11} c="var(--color-text-dim)" ta="center">
            Aktualizováno {garage.updated}
          </Text>
        </>
      )}
    </Stack>
  );
}
