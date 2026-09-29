// A table row's photo: small, filled, and a gauge where the bike has none.
import type { ReactElement } from "react";
import { Box, Center, Image } from "@mantine/core";
import { Gauge } from "lucide-react";
import type { Bike } from "@/features/bikes/bikes.types";
import { bikeTitle } from "@/features/bikes/bikeTitle";

export function BikeThumb({ bike }: { bike: Bike }): ReactElement {
  return (
    <Box w={56} h={28} style={{ borderRadius: "var(--mantine-radius-sm)", overflow: "hidden" }}>
      {bike.image_url ? (
        <Image src={bike.image_url} alt={bikeTitle(bike)} w="100%" h="100%" fit="cover" loading="lazy" bg="#FFFFFF" />
      ) : (
        <Center h="100%" bg="cards.7">
          <Gauge size={14} color="var(--mantine-color-text-9)" />
        </Center>
      )}
    </Box>
  );
}
