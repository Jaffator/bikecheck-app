// The one follow control, drawn from where I stand with the person and how their profile is
// set: Sledovat on a Public profile takes at once; Sledujete asks before leaving. Shared by
// the profile hero and every person row. Never drawn for myself.
import { useState, type ReactElement } from "react";
import { Button } from "@mantine/core";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { ProfileRelation, ProfileVisibility } from "@/features/profile/profile.types";
import { useFollow, useUnfollow } from "../follow.queries";
import type { FollowingRowRelation } from "../follow.types";

const ICON_SIZE = 14;

interface FollowButtonProps {
  handle: string;
  visibility: ProfileVisibility;
  // The profile hero hands over what its page read, a person row what its list read.
  relation: ProfileRelation | FollowingRowRelation;
  // Rows wear the small one; the profile hero the regular one.
  size?: "xs" | "sm";
}

export function FollowButton({ handle, visibility, relation, size = "xs" }: FollowButtonProps): ReactElement | null {
  const { t } = useTranslation();
  const follow = useFollow(handle);
  const unfollow = useUnfollow(handle);
  const [leaving, setLeaving] = useState(false);

  if (relation === "SELF") return null;

  const common = { size, radius: "xl" as const, style: { flexShrink: 0 } };

  if (relation === "FOLLOWING") {
    return (
      <>
        <Button
          {...common}
          variant="outline"
          leftSection={<Check size={ICON_SIZE} color="var(--mantine-color-primary-5)" />}
          onClick={() => setLeaving(true)}
        >
          {t("follow.following")}
        </Button>
        <ConfirmModal
          opened={leaving}
          onCancel={() => setLeaving(false)}
          onConfirm={() => unfollow.mutate(undefined, { onSettled: () => setLeaving(false) })}
          title={t("follow.unfollowTitle", { handle })}
          // Leaving a Followers-only garage means asking again to get back in.
          body={t(visibility === "FOLLOWERS" ? "follow.unfollowBodyFollowers" : "follow.unfollowBodyPublic")}
          cancelLabel={t("follow.back")}
          confirmLabel={t("follow.unfollowConfirm")}
          pending={unfollow.isPending}
        />
      </>
    );
  }

  // Požádat and Čeká are the request slice's (#146): a Followers-only profile and a waiting
  // request draw nothing yet.
  if (relation !== "NONE" || visibility !== "PUBLIC") return null;

  return (
    <Button {...common} color="primary.6" c="textDark.6" loading={follow.isPending} onClick={() => follow.mutate()}>
      {t("follow.follow")}
    </Button>
  );
}
