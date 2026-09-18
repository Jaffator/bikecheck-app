// PROTOTYPE #129 — variant 3 "Vizitka": the owner centred like a contact card (avatar,
// name, handle, badge, the button across the full width), the figures as one mono line,
// and the bikes as a two-column grid of small cards. Profile first, machines second.
import type { ReactElement } from "react";
import { Box, Image, Paper, SimpleGrid, Stack, Text, UnstyledButton } from "@mantine/core";
import { Gauge } from "lucide-react";
import { PersonAvatar } from "./FollowButton";
import { ProfileLocked } from "./ProfileLocked";
import { formatKm, garageFigures } from "./profile.figures";
import { OffNotice, OwnerAction, VisibilityBadge } from "./ProfileShared";
import type { ProfileView } from "./profile.model";
import { PANEL } from "./shared";

interface Props {
  view: Exclude<ProfileView, { kind: "missing" }>;
  openBike: (id: number) => void;
}

export function ProfileVariantCard({ view, openBike }: Props): ReactElement {
  const { person } = view;
  const owner = view.kind === "garage" && view.owner;
  const garage = view.kind === "garage" ? view.garage : null;

  return (
    <Stack gap="lg" px={8} pt="lg" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {owner && person.visibility === "OFF" && <OffNotice />}

      <Stack align="center" gap={6}>
        <PersonAvatar person={person} size={88} />
        <Text fw={700} fz={20} c="text.6" ta="center" lh={1.2} pt={4}>
          {person.name}
        </Text>
        <Text className="font-mono" fz={13} c="var(--color-text-dim)">
          @{person.handle}
        </Text>
        <VisibilityBadge visibility={person.visibility} size={13} />
        <Box w="100%" pt="xs" style={{ display: "flex", justifyContent: "center" }}>
          <OwnerAction person={person} owner={owner} size="sm" fullWidth />
        </Box>
        {garage && (
          <Text className="font-mono" fz={12} c="var(--color-text-dim)" ta="center" pt={4}>
            {garageFigures(garage)
              .map((figure) => `${figure.value} ${figure.label.toLowerCase()}`)
              .join(" · ")}
          </Text>
        )}
      </Stack>

      {view.kind === "locked" && <ProfileLocked person={person} relation={view.relation} />}

      {garage && (
        <>
          <SimpleGrid cols={2} spacing="sm">
            {garage.bikes.map((bike) => (
              <UnstyledButton key={bike.id} onClick={() => openBike(bike.id)} className="active:scale-[0.985]" style={{ transition: "transform 0.12s ease" }}>
                <Paper radius="lg" style={{ ...PANEL, overflow: "hidden" }}>
                  <Box
                    style={{
                      aspectRatio: "16 / 10",
                      backgroundColor: bike.photo ? "#FFFFFF" : "var(--mantine-color-cards-7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {bike.photo ? <Image src={bike.photo} alt="" w="100%" h="100%" fit="cover" /> : <Gauge size={24} color="var(--mantine-color-text-9)" />}
                  </Box>
                  <Stack gap={1} p="sm">
                    <Text fw={600} fz={14} c="text.6" lineClamp={1}>
                      {bike.name}
                    </Text>
                    <Text fz={12} c="var(--color-text-dim)" lineClamp={1}>
                      {bike.model} · {bike.chips[0]}
                    </Text>
                    <Text className="font-mono" fz={11} c="var(--color-text-dim)" lineClamp={1} pt={2}>
                      {formatKm(bike.km)}
                    </Text>
                  </Stack>
                </Paper>
              </UnstyledButton>
            ))}
          </SimpleGrid>
          <Text className="font-mono" fz={11} c="var(--color-text-dim)" ta="center">
            Aktualizováno {garage.updated}
          </Text>
        </>
      )}
    </Stack>
  );
}
