// PROTOTYPE #128 — the one follow control, shared by the search row, the following row and
// the profile header (#126 / #129). Four states: Sledovat (PUBLIC, takes at once), Požádat
// (FOLLOWERS, waits), Čeká, Sledujete. Leaving either standing state asks first.
import { useState, type ReactElement } from "react";
import { Avatar, Button } from "@mantine/core";
import { Check, Clock } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import type { Person } from "./people";
import { usePrototypeStore } from "./prototype.store";

interface FollowButtonProps {
  person: Person;
  // Rows wear the small one; the profile header the regular one.
  size?: "xs" | "sm";
}

// Which of the two questions is open, if any.
type Leaving = "unfollow" | "withdraw" | null;

export function FollowButton({ person, size = "xs" }: FollowButtonProps): ReactElement {
  const status = usePrototypeStore((state) => state.following[person.handle]);
  const follow = usePrototypeStore((state) => state.follow);
  const unfollow = usePrototypeStore((state) => state.unfollow);
  const [leaving, setLeaving] = useState<Leaving>(null);

  const common = { size, radius: "xl" as const, style: { flexShrink: 0 } };

  if (status === "ACCEPTED") {
    return (
      <>
        <Button {...common} variant="default" leftSection={<Check size={14} />} onClick={() => setLeaving("unfollow")}>
          Sledujete
        </Button>
        <ConfirmModal
          opened={leaving === "unfollow"}
          onCancel={() => setLeaving(null)}
          onConfirm={() => {
            unfollow(person.handle);
            setLeaving(null);
          }}
          title={`Přestat sledovat @${person.handle}?`}
          body={
            person.visibility === "FOLLOWERS"
              ? "Garáž ti zmizí. Profil je jen pro sledující, znovu budeš muset požádat."
              : "Garáž ti zmizí ze sledovaných. Sledovat můžeš kdykoli znovu."
          }
          cancelLabel="Zpět"
          confirmLabel="Přestat sledovat"
        />
      </>
    );
  }

  if (status === "PENDING") {
    return (
      <>
        <Button
          {...common}
          variant="default"
          c="var(--color-text-dim)"
          leftSection={<Clock size={14} />}
          onClick={() => setLeaving("withdraw")}
        >
          Čeká
        </Button>
        <ConfirmModal
          opened={leaving === "withdraw"}
          onCancel={() => setLeaving(null)}
          onConfirm={() => {
            unfollow(person.handle);
            setLeaving(null);
          }}
          title="Stáhnout žádost?"
          body={`@${person.handle} se o tom nedozví. Požádat můžeš kdykoli znovu.`}
          cancelLabel="Zpět"
          confirmLabel="Stáhnout"
        />
      </>
    );
  }

  return (
    <Button {...common} color="primary.6" onClick={() => follow(person.handle, person.visibility)}>
      {person.visibility === "PUBLIC" ? "Sledovat" : "Požádat"}
    </Button>
  );
}

// One face for a person everywhere: initials on a colour of their own, since the mock has
// no pictures. The real thing takes avatar_url (#119).
export function PersonAvatar({ person, size }: { person: Person; size: number }): ReactElement {
  return <Avatar name={person.name} color="initials" radius="xl" size={size} style={{ flexShrink: 0 }} />;
}
