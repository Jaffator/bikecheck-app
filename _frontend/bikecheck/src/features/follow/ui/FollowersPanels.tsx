// Tab Sledující: the requests waiting on me, each answered from its row, over the people who
// follow me, each removable. All of it is mine whatever the profile's switch says.
import { useState, type ReactElement } from "react";
import { ActionIcon, Button, Stack, Text } from "@mantine/core";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMyProfile } from "@/features/profile/profile.queries";
import type { Profile } from "@/features/profile/profile.types";
import { EYEBROW } from "@/features/profile/profileSurface";
import { useAcceptFollower, useFollowers, useRemoveFollower } from "../follow.queries";
import type { FollowerRow } from "../follow.types";
import { FollowPanel } from "./FollowPanel";
import { PAGE_BOTTOM } from "./FollowingPanels";
import { PersonRow } from "./PersonRow";
import { RemoveFollowerSheet } from "./RemoveFollowerSheet";

const ACTION_SIZE = 32;
const ICON_SIZE = 16;

type Translate = (key: string, options?: Record<string, string>) => string;

export function FollowersPanels(): ReactElement {
  const { t } = useTranslation();
  const { data: profile } = useMyProfile();
  const { data: rows, isError } = useFollowers();
  // The last person Odebrat was pressed for stays after the sheet closes, for its exit slide.
  const [removing, setRemoving] = useState<FollowerRow | null>(null);
  const [asking, setAsking] = useState(false);

  const requests = rows?.filter((row) => row.status === "PENDING");
  const followers = rows?.filter((row) => row.status === "ACCEPTED");

  function askToRemove(person: FollowerRow): void {
    setRemoving(person);
    setAsking(true);
  }

  return (
    <Stack gap="md" px={8} pt="md" pb={PAGE_BOTTOM}>
      {/* Requests only exist while approval does: a Public profile has no panel for them. */}
      {profile?.visibility !== "PUBLIC" && (
        <FollowPanel
          title={
            // A request waiting is the one thing on the tab that asks for something, so it takes the accent.
            <Text {...EYEBROW} c={requests !== undefined && requests.length > 0 ? "primary.5" : EYEBROW.c} span>
              {countedTitle(t("follow.requestsTitle"), requests)}
            </Text>
          }
          empty={emptyText(t, requests, isError, t("follow.noRequests"))}
        >
          {(requests ?? []).map((person) => (
            <PersonRow key={person.user_id} person={person}>
              <RequestActions person={person} />
            </PersonRow>
          ))}
        </FollowPanel>
      )}

      <FollowPanel
        title={countedTitle(t("follow.followersTitle"), followers)}
        empty={emptyText(t, followers, isError, noFollowersText(t, profile))}
      >
        {(followers ?? []).map((person) => (
          <PersonRow key={person.user_id} person={person}>
            <Button
              variant="outline"
              size="xs"
              radius="xl"
              c="var(--color-text-dim)"
              style={{ flexShrink: 0 }}
              onClick={() => askToRemove(person)}
            >
              {t("follow.remove")}
            </Button>
          </PersonRow>
        ))}
      </FollowPanel>

      <RemoveFollowerSheet person={removing} opened={asking} onClose={() => setAsking(false)} />
    </Stack>
  );
}

// ✓ accepts, ✗ declines at once - no dialog, so clearing a list of requests is not a list
// of dialogs. Each row has its own hooks, so only the button pressed shows busy.
function RequestActions({ person }: { person: FollowerRow }): ReactElement {
  const { t } = useTranslation();
  const accept = useAcceptFollower();
  const decline = useRemoveFollower();

  return (
    <>
      <ActionIcon
        variant="filled"
        color="primary.6"
        c="textDark.6"
        radius="xl"
        size={ACTION_SIZE}
        aria-label={t("follow.accept")}
        loading={accept.isPending}
        disabled={decline.isPending}
        onClick={() => accept.mutate(person)}
      >
        <Check size={ICON_SIZE} />
      </ActionIcon>
      <ActionIcon
        variant="outline"
        radius="xl"
        size={ACTION_SIZE}
        aria-label={t("follow.decline")}
        loading={decline.isPending}
        disabled={accept.isPending}
        onClick={() => decline.mutate(person)}
      >
        <X size={ICON_SIZE} />
      </ActionIcon>
    </>
  );
}

// "Žádosti · n" once the list is in; the eyebrow alone while it loads.
function countedTitle(label: string, rows: FollowerRow[] | undefined): string {
  return rows === undefined ? label : `${label} · ${String(rows.length)}`;
}

// Nothing while the list loads, the fault when it failed, else what the panel says when empty.
function emptyText(t: Translate, rows: FollowerRow[] | undefined, failed: boolean, empty: string): string {
  if (failed) return t("follow.listFailed");
  if (rows === undefined) return "";
  return empty;
}

// Why nobody follows me yet depends on whether anybody could.
function noFollowersText(t: Translate, profile: Profile | undefined): string {
  const title = t("follow.noFollowers");
  if (profile === undefined) return title;
  if (profile.visibility === "OFF") return `${title} ${t("follow.noFollowersOff")}`;
  if (profile.visibility === "PUBLIC") return `${title} ${t("follow.noFollowersPublic")}`;
  return `${title} ${t("follow.noFollowersFollowers", { handle: profile.handle ?? "" })}`;
}
