// Desktop Riders: the search in the header, the two lists in one card, my profile beside it.
// While a query is asked the card shows its results instead of the tabs.
import { useEffect, useState, type ReactElement } from "react";
import { Box, Grid, Paper, Tabs } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useFollowers, useFollowing } from "@/features/follow/follow.queries";
import { useTypedFollowSearch } from "@/features/follow/useTypedFollowSearch";
import { FollowersList } from "@/features/follow/ui/FollowersPanels";
import { FollowingList } from "@/features/follow/ui/FollowingPanels";
import { FollowSearchField, FollowSearchResults } from "@/features/follow/ui/FollowSearch";
import { FollowsTabLabel } from "@/features/follow/ui/FollowsTabLabel";
import { PANEL } from "@/features/profile/profileSurface";
import { ProfileCard } from "@/features/profile/ui/ProfileCard";
import { useHeaderStore } from "@/store/store";

type FollowsTab = "following" | "followers";

const SEARCH_WIDTH = 320;

export function FollowsDesktop(): ReactElement {
  const [typed, setTyped] = useState("");
  const { askable, searching, search } = useTypedFollowSearch(typed);
  useHeaderSearch(typed, setTyped, searching);

  return (
    // The header leaves 4px under its row; 12 more makes the page's 16px gap.
    <Box p="xl" pt={12}>
      <Grid gap="md" align="flex-start">
        <Grid.Col span={{ base: 12, lg: 8 }}>
          <Paper style={PANEL}>
            {askable ? (
              <Box p="md">
                <FollowSearchResults answer={search.data} failed={search.isError} />
              </Box>
            ) : (
              <FollowsTabs />
            )}
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, lg: 4 }}>
          <ProfileCard />
        </Grid.Col>
      </Grid>
    </Box>
  );
}

// The field hangs in the header beside the title - see the header store. It leaves with the page.
function useHeaderSearch(typed: string, onChange: (value: string) => void, searching: boolean): void {
  const setActionSlot = useHeaderStore((state) => state.setActionSlot);

  useEffect(() => {
    setActionSlot(
      <FollowSearchField value={typed} onChange={onChange} searching={searching} style={{ width: SEARCH_WIDTH }} />,
    );
    return () => setActionSlot(null);
  }, [setActionSlot, typed, onChange, searching]);
}

// The same ?tab=followers the phone reads, so the dashboard and the notifications land here too.
function FollowsTabs(): ReactElement {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab: FollowsTab = params.get("tab") === "followers" ? "followers" : "following";
  const { data: following } = useFollowing();
  const { data: followers } = useFollowers();
  const followingCount = following?.filter((row) => row.relation === "FOLLOWING").length;
  const followersCount = followers?.filter((row) => row.status === "ACCEPTED").length;

  // Replaced rather than pushed, so Back leaves the page instead of stepping through tabs.
  function selectTab(next: FollowsTab): void {
    const nextParams = new URLSearchParams(params);
    if (next === "followers") nextParams.set("tab", "followers");
    else nextParams.delete("tab");
    setParams(nextParams, { replace: true });
  }

  return (
    <Tabs
      value={tab}
      onChange={(value) => selectTab(value === "followers" ? "followers" : "following")}
      color="primary.6"
      styles={{
        root: { "--tab-border-color": "var(--color-border-subtle)" },
        tab: { borderBottomWidth: 2, "--tab-hover-color": "transparent" },
      }}
    >
      <Tabs.List px="md">
        <Tabs.Tab value="following" c={tab === "following" ? "text.6" : "text.8"}>
          <FollowsTabLabel label={t("follow.tabFollowing")} count={followingCount} />
        </Tabs.Tab>
        <Tabs.Tab value="followers" c={tab === "followers" ? "text.6" : "text.8"}>
          <FollowsTabLabel label={t("follow.tabFollowers")} count={followersCount} />
        </Tabs.Tab>
      </Tabs.List>
      <Box p="md">{tab === "following" ? <FollowingList empty={t("follow.noFollowing")} /> : <FollowersList />}</Box>
    </Tabs>
  );
}
