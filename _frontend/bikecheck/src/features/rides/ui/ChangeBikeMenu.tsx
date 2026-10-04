// Moves an assigned ride to another bike, from the ride's detail.
import type { ReactElement } from "react";
import { Button, Menu } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBikes } from "@/features/bikes/bikes.queries";
import { bikeTitle } from "@/features/bikes/bikeTitle";
import { BikeColorDot } from "@/features/bikes/ui/BikeColorDot";
import { useChangeRideBike } from "@/features/rides/rides.queries";
import type { Ride } from "@/features/rides/rides.types";
import { BAR_BUTTON_HEIGHT } from "./actionBar";

interface ChangeBikeMenuProps {
  ride: Ride;
  // The sheet holds a snapshot of the ride, so it closes rather than show the old bike.
  onMoved: () => void;
  // The detail's action bar: a bar-sized button in the row instead of one at the section's end.
  inBar?: boolean;
}

export function ChangeBikeMenu({ ride, onMoved, inBar = false }: ChangeBikeMenuProps): ReactElement {
  const { t } = useTranslation();
  const { data: bikes } = useBikes();
  const change = useChangeRideBike();

  function move(bikeId: number, bikeName: string): void {
    change.mutate(
      { rideId: ride.id, bikeId },
      {
        onSuccess: () => {
          notifications.show({ message: t("rides.bikeChanged", { bike: bikeName }) });
          onMoved();
        },
        onError: () => notifications.show({ color: "red.5", message: t("rides.changeBikeFailed") }),
      },
    );
  }

  return (
    <Menu position="bottom-end" radius="md" shadow="md">
      <Menu.Target>
        <Button
          variant="outline"
          radius="md"
          size={inBar ? "sm" : "xs"}
          h={inBar ? BAR_BUTTON_HEIGHT : undefined}
          loading={change.isPending}
          rightSection={<ChevronDown size={14} />}
          style={inBar ? undefined : { alignSelf: "flex-end" }}
        >
          {t("rides.changeBike")}
        </Button>
      </Menu.Target>
      <Menu.Dropdown
        bg="cards.6"
        p={8}
        style={{ border: "1px solid var(--mantine-color-cards-6)", boxShadow: "var(--elev-panel)" }}
      >
        {(bikes ?? []).map((bike) => {
          const current = bike.id === ride.bike_id;
          return (
            <Menu.Item
              key={bike.id}
              color="text"
              fw={600}
              disabled={current}
              leftSection={<BikeColorDot colorIndex={bike.color_index} />}
              rightSection={current ? <Check size={14} /> : undefined}
              onClick={() => move(bike.id, bikeTitle(bike))}
            >
              {bikeTitle(bike)}
            </Menu.Item>
          );
        })}
      </Menu.Dropdown>
    </Menu>
  );
}
