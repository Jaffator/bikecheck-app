// Tab Sledovaní: the search over the list of whom I follow and whom I asked. Each tab body
// brings its own page padding, so the swipe track can lay them side by side.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFollowing } from "../follow.queries";
import type { FollowingRow } from "../follow.types";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { FollowSearch } from "./FollowSearch";
import { PersonRow } from "./PersonRow";

export const PAGE_BOTTOM = "calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

export function FollowingPanels(): ReactElement {
  const { t } = useTranslation();
  const { data: following, isError } = useFollowing();

  return (
    <Stack gap="md" px={8} pt="md" pb={PAGE_BOTTOM}>
      <FollowSearch />
      <FollowPanel title={followingTitle(t("follow.followingTitle"), following)} empty={emptyText(t, following, isError)}>
        {(following ?? []).map((person) => (
          <PersonRow key={person.handle} person={person}>
            <FollowButton handle={person.handle} visibility={person.visibility} relation={person.relation} size="xs" />
          </PersonRow>
        ))}
      </FollowPanel>
    </Stack>
  );
}

// "Sleduješ · n" once the list is in; the eyebrow alone while it loads.
function followingTitle(label: string, following: FollowingRow[] | undefined): string {
  return following === undefined ? label : `${label} · ${String(following.length)}`;
}

// Nothing while the list loads, the fault when it failed, else the invitation to search.
function emptyText(t: (key: string) => string, following: FollowingRow[] | undefined, failed: boolean): string {
  if (failed) return t("follow.listFailed");
  if (following === undefined) return "";
  return t("follow.noFollowing");
}
