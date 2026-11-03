// Desktop Setup: profiles, tyres and the note in a column that holds still beside the fork and
// shock. The same 4/8 split as the bike's own detail page, which Setup is opened from.
import type { ReactElement, ReactNode } from "react";
import { Grid } from "@mantine/core";

// Below Mantine's xl the 8/12 column is too narrow for two suspension cards, so the page stacks
// and profiles sit beside the tyres instead.
const STICKY_ASIDE = "min-[88em]:sticky min-[88em]:top-[calc(3rem+1rem)]";

interface SetupDesktopLayoutProps {
  profiles: ReactNode;
  tyres: ReactNode;
  note: ReactNode;
  suspension: ReactNode;
}

export function SetupDesktopLayout({ profiles, tyres, note, suspension }: SetupDesktopLayoutProps): ReactElement {
  return (
    <Grid gap="md" align="flex-start">
      <Grid.Col span={{ base: 12, xl: 4 }} className={STICKY_ASIDE}>
        <Grid gap="md" align="flex-start">
          <Grid.Col span={{ base: 6, xl: 12 }}>{profiles}</Grid.Col>
          <Grid.Col span={{ base: 6, xl: 12 }}>{tyres}</Grid.Col>
          <Grid.Col span={12}>{note}</Grid.Col>
        </Grid>
      </Grid.Col>
      <Grid.Col span={{ base: 12, xl: 8 }}>{suspension}</Grid.Col>
    </Grid>
  );
}
