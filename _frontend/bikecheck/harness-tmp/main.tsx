import { createRoot } from "react-dom/client";
import { MantineProvider, Stack } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@/global.css";
import "@/i18n";
import { theme } from "@/theme";
import { DistanceCard } from "@/features/stats/ui/DistanceCard";
import type { Distance, DistanceBike } from "@/features/stats/stats.types";

const DAYS = 30;
function bike(id: number, name: string, color: number, perDayM: number): DistanceBike {
  const daily = Array.from({ length: DAYS }, () => perDayM);
  return {
    bike_id: id, bike_brand: name, bike_model: null, year: null, color_index: color,
    daily_m: daily, daily_elevation_m: daily.map(() => 0),
    total_km: Math.round((perDayM * DAYS) / 1000), ride_count: 5, time_min: 300,
  } as DistanceBike;
}
const distance: Distance = {
  from: "2026-10-01",
  to: "2026-10-30",
  bikes: [bike(1, "Canyon", 0, 13700), bike(2, "Specialized", 1, 13500), bike(3, "Trek", 2, 13300), bike(4, "Kona", 3, 1000)],
};
const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
client.setQueryData(["rides", "distance", "month"], distance);

createRoot(document.getElementById("root")!).render(
  <MantineProvider theme={theme}>
    <QueryClientProvider client={client}>
      <Stack px="md" pt="md" style={{ background: "#121212", minHeight: "100vh" }}>
        <DistanceCard period="month" />
      </Stack>
    </QueryClientProvider>
  </MantineProvider>,
);
