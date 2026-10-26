import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, Stack } from "@mantine/core";
import "@mantine/core/styles.css";
import "@/global.css";
import "@/i18n";
import { theme } from "@/theme";
import { HomePeriodSwitcher } from "@/features/stats/ui/HomePeriodSwitcher";
import type { HomePeriod } from "@/features/stats/stats.types";

function App() {
  const [p, setP] = useState<HomePeriod>("month");
  return (
    <MantineProvider theme={theme}>
      <Stack gap="sm" px="md" pt="md" style={{ background: "#1a1a1a", minHeight: "100vh" }}>
        <HomePeriodSwitcher value={p} onChange={setP} fullWidth />
        <HomePeriodSwitcher value={p} onChange={setP} />
      </Stack>
    </MantineProvider>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
