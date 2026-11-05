// Time in the saddle by weekday: seven bars, Monday first, the most ridden in the accent, their names under
// them level with the words under the value.
import type { ReactElement } from "react";
import { Box, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { CURRENT_COLOR, SHADOW_COLOR } from "./periodColors";

// The bars centre in the value row and the gap under it; the names take the chip row's height.
const BAR_AREA = 38;
const NAME_LINE = 22;
// A weekday ridden a little still shows.
const MIN_BAR = 2;

// "Po" … "Ne", "Mo" … "Su": the locale's short names cut to two letters, since seven of three would not fit
// the slot; counted from a known Monday.
function weekdayNames(language: string): string[] {
  const names = new Intl.DateTimeFormat(language, { weekday: "short", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) => {
    const name = names.format(new Date(Date.UTC(2024, 0, 1 + index))).slice(0, 2);
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

export function WeekdayBars({ minutes, label }: { minutes: number[]; label: string }): ReactElement {
  const { i18n } = useTranslation();
  // Nothing ridden means no top day, so no bar takes the accent; tied days all do.
  const top = Math.max(...minutes);
  const names = weekdayNames(i18n.language);

  return (
    <Box
      role="img"
      aria-label={label}
      style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4 }}
    >
      {minutes.map((value, index) => (
        <Box key={index}>
          <Box pos="relative" h={BAR_AREA}>
            <Box
              pos="absolute"
              left={0}
              right={0}
              bottom={0}
              h={top === 0 ? MIN_BAR : Math.max(MIN_BAR, (value / top) * BAR_AREA)}
              style={{ borderRadius: 2, backgroundColor: top > 0 && value === top ? CURRENT_COLOR : SHADOW_COLOR }}
            />
          </Box>
          <Text fz={10} lh={`${String(NAME_LINE)}px`} c="text.8" ta="center">
            {names[index]}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
