// Desktop Setup's own header: where it hangs in the app over the page title, Save on the right.
// Taller than the app's bar, so the page hides that one and holds this at the top instead.
import type { MouseEvent, ReactElement, ReactNode } from "react";
import { Anchor, Breadcrumbs, Group, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

// The overviews' title size and the air above it, so Setup's title sits where theirs do.
const TITLE_SIZE = 28;
const PAD_TOP = 24;

interface SetupDesktopHeaderProps {
  bikeId: number;
  bikeName: string;
  // Every link goes through here, so leaving with unsaved numbers is asked about first.
  onLeave: (to: string) => void;
  actions: ReactNode;
}

export function SetupDesktopHeader({ bikeId, bikeName, onLeave, actions }: SetupDesktopHeaderProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Group
      justify="space-between"
      align="flex-end"
      wrap="nowrap"
      gap="md"
      pt={PAD_TOP}
      pb="sm"
      style={{ position: "sticky", top: 0, zIndex: 2, backgroundColor: "var(--mantine-color-background-9)" }}
    >
      <Stack gap={2} style={{ minWidth: 0 }}>
        <Breadcrumbs separator="›" separatorMargin={6} fz={13} c="var(--color-text-dim)">
          <CrumbLink to="/bikes" onLeave={onLeave}>
            {t("page.bikes")}
          </CrumbLink>
          <CrumbLink to={`/bikes/${String(bikeId)}`} onLeave={onLeave}>
            {bikeName}
          </CrumbLink>
        </Breadcrumbs>
        <Text component="h1" m={0} fz={TITLE_SIZE} fw={700} lh={1.2} lts="var(--tracking-display)" c="text.6">
          {t("setup.title")}
        </Text>
      </Stack>
      {actions}
    </Group>
  );
}

interface CrumbLinkProps {
  to: string;
  onLeave: (to: string) => void;
  children: ReactNode;
}

// A real link for the address bar and middle-click; a plain click is handed to the page.
function CrumbLink({ to, onLeave, children }: CrumbLinkProps): ReactElement {
  function click(event: MouseEvent<HTMLAnchorElement>): void {
    event.preventDefault();
    onLeave(to);
  }

  return (
    <Anchor component={Link} to={to} onClick={click} fz="inherit" c="var(--color-text-dim)" underline="hover" lineClamp={1}>
      {children}
    </Anchor>
  );
}
