// Tab Sledovaní: the search over the list of whom I follow and whom I asked.
import type { ReactElement } from "react";
import { Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useFollowing } from "../follow.queries";
import { PAGE_BOTTOM, showPanel } from "../followPanels";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { FollowSearch } from "./FollowSearch";
import { PersonRow } from "./PersonRow";

export function FollowingPanels(): ReactElement {
  const { t } = useTranslation();
  const { data: following, isError } = useFollowing();

  return (
    <Stack gap="md" px="md" pt="md" pb={PAGE_BOTTOM}>
      <FollowSearch />
      {/* Nobody followed yet leaves only the search: its placeholder already says what to do. */}
      {showPanel(following, isError) && (
        <FollowPanel title={t("follow.followingTitle")} empty={t("follow.listFailed")}>
          {(following ?? []).map((person) => (
            <PersonRow key={person.handle} person={person}>
              <FollowButton handle={person.handle} visibility={person.visibility} relation={person.relation} size="xs" />
            </PersonRow>
          ))}
        </FollowPanel>
      )}
    </Stack>
  );
}
