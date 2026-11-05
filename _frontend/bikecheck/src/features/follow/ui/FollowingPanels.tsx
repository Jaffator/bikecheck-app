// Tab Sledovaní: the search over the list of whom I follow and whom I asked.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFollowing } from "../follow.queries";
import { emptyText, PAGE_BOTTOM, showPanel } from "../followPanels";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { FollowSearch } from "./FollowSearch";
import { PersonRow } from "./PersonRow";

export function FollowingPanels(): ReactElement {
  return (
    <Stack gap="md" px="var(--page-inset)" pt="md" pb={PAGE_BOTTOM}>
      <FollowSearch />
      <FollowingList />
    </Stack>
  );
}

// Without `empty`, nobody followed yet leaves only the search: its placeholder already says what to do.
export function FollowingList({ empty }: { empty?: string }): ReactElement | null {
  const { t } = useTranslation();
  const { data: following, isError } = useFollowing();

  if (empty === undefined && !showPanel(following, isError)) return null;
  return (
    <FollowPanel title={t("follow.followingTitle")} empty={emptyText(t, following, isError, empty ?? "")}>
      {(following ?? []).map((person) => (
        <PersonRow key={person.handle} person={person}>
          <FollowButton handle={person.handle} visibility={person.visibility} relation={person.relation} size="xs" />
        </PersonRow>
      ))}
    </FollowPanel>
  );
}
