// A bike by its small photo and name, for a sheet that has to say which bike it is about.
import type { ReactElement } from "react";
import { Group, Text } from "@mantine/core";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { useBike } from "@/features/bikes/bikes.queries";
import { BikeThumb } from "./BikeThumb";

export function BikeNameRow({ bikeId }: { bikeId: number }): ReactElement | null {
  const { data: bike } = useBike(bikeId);
  if (bike === undefined) return null;

  return (
    <Group gap={12} wrap="nowrap">
      <BikeThumb bike={bike} />
      <Text fz={15} fw={600} c="text.6" truncate>
        {bikeTitle(bike)}
      </Text>
    </Group>
  );
}
