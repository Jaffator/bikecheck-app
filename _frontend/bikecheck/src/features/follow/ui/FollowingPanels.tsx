// Tab Sledovaní: the search over the list of whom I follow and whom I asked.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFollowing } from "../follow.queries";
import { countedTitle, emptyText, PAGE_BOTTOM } from "../followPanels";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { FollowSearch } from "./FollowSearch";
import { PersonRow } from "./PersonRow";

export function FollowingPanels(): ReactElement {
  const { t } = useTranslation();
  const { data: following, isError } = useFollowing();

  return (
    <Stack gap="md" px={8} pt="md" pb={PAGE_BOTTOM}>
      <FollowSearch />
      <FollowPanel
        title={countedTitle(t("follow.followingTitle"), following)}
        empty={emptyText(t, following, isError, t("follow.noFollowing"))}
      >
        {(following ?? []).map((person) => (
          <PersonRow key={person.handle} person={person}>
            <FollowButton handle={person.handle} visibility={person.visibility} relation={person.relation} size="xs" />
          </PersonRow>
        ))}
      </FollowPanel>
    </Stack>
  );
}
