// PROTOTYPE #128 — variant 1 "Karty": every person is a card row, the way Notifications
// draws its rows. Typing swaps the following list for the results. Removing a follower
// asks in a ConfirmModal; declining a request does not ask.
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Button, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { Check, Users, X } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { FollowButton, PersonAvatar } from "./FollowButton";
import type { FollowsModel, FollowsTab } from "./follows.model";
import { CAPPED, NO_FOLLOWERS_TITLE, NO_FOLLOWING_HINT, NO_FOLLOWING_TITLE, NO_RESULTS, useNoFollowersHint } from "./followsCopy";
import { SearchInput } from "./FollowsShared";
import type { Person } from "./people";
import { EYEBROW } from "./shared";

const AVATAR = 44;
// The search field and the segment already take the top; the copy centres in what is left.
const EMPTY_BAND = "48dvh";

interface Props {
  model: FollowsModel;
  tab: FollowsTab;
}

function PersonCard({
  person,
  onOpen,
  children,
}: {
  person: Person;
  onOpen: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <Paper bg="cards.6" radius="lg" p="sm" pl="md" style={{ border: "1px solid var(--color-border-subtle)" }}>
      <Group gap="sm" wrap="nowrap">
        <UnstyledButton onClick={onOpen} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm" wrap="nowrap">
            <PersonAvatar person={person} size={AVATAR} />
            <Stack gap={0} style={{ minWidth: 0 }}>
              <Text fw={600} fz={15} c="text.6" lineClamp={1}>
                {person.name}
              </Text>
              <Text className="font-mono" fz={12} c="var(--color-text-dim)" lineClamp={1}>
                @{person.handle}
              </Text>
            </Stack>
          </Group>
        </UnstyledButton>
        {children}
      </Group>
    </Paper>
  );
}

function FollowingTab({ model }: { model: FollowsModel }): ReactElement {
  const { search, following, openProfile } = model;

  let body: ReactNode;
  if (search.results !== null) {
    body =
      search.results.length === 0 ? (
        !search.searching && (
          <Text fz={14} c="var(--color-text-dim)" ta="center" pt="xl">
            {NO_RESULTS}
          </Text>
        )
      ) : (
        <Stack gap="sm">
          <Text {...EYEBROW}>Výsledky</Text>
          {search.results.map((person) => (
            <PersonCard key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
              <FollowButton person={person} />
            </PersonCard>
          ))}
          {search.capped && (
            <Text fz={13} c="var(--color-text-dim)" ta="center" py="xs">
              {CAPPED}
            </Text>
          )}
        </Stack>
      );
  } else if (following.length === 0) {
    body = (
      <EmptyStateLayout
        icon={<Users size={72} strokeWidth={1.25} />}
        title={NO_FOLLOWING_TITLE}
        body={NO_FOLLOWING_HINT}
        bandHeight={EMPTY_BAND}
      />
    );
  } else {
    body = (
      <Stack gap="sm">
        <Text {...EYEBROW}>Sleduješ · {following.length}</Text>
        {following.map(({ person }) => (
          <PersonCard key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
            <FollowButton person={person} />
          </PersonCard>
        ))}
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <SearchInput search={search} />
      {body}
    </Stack>
  );
}

function FollowersTab({ model }: { model: FollowsModel }): ReactElement {
  const { requests, followers, accept, remove, openProfile } = model;
  const hint = useNoFollowersHint();
  // Whom the owner is about to remove. Null keeps the question shut.
  const [removing, setRemoving] = useState<Person | null>(null);

  if (requests.length === 0 && followers.length === 0) {
    return (
      <EmptyStateLayout
        icon={<Users size={72} strokeWidth={1.25} />}
        title={NO_FOLLOWERS_TITLE}
        body={hint}
        bandHeight={EMPTY_BAND}
      />
    );
  }

  return (
    <Stack gap="lg">
      {requests.length > 0 && (
        <Stack gap="sm">
          <Text {...EYEBROW} c="primary.5">
            Žádosti · {requests.length}
          </Text>
          {requests.map((person) => (
            <PersonCard key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
              {/* Two round answers: yes takes the accent, no stays quiet. Neither asks twice. */}
              <ActionIcon variant="filled" color="primary.6" c="textDark.6" radius="xl" size={36} aria-label="Přijmout" onClick={() => accept(person.handle)}>
                <Check size={18} />
              </ActionIcon>
              <ActionIcon variant="default" radius="xl" size={36} aria-label="Odmítnout" onClick={() => remove(person.handle)}>
                <X size={18} />
              </ActionIcon>
            </PersonCard>
          ))}
        </Stack>
      )}

      {followers.length > 0 && (
        <Stack gap="sm">
          <Text {...EYEBROW}>Sledující · {followers.length}</Text>
          {followers.map((person) => (
            <PersonCard key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
              <Button variant="subtle" color="text.8" size="xs" radius="xl" onClick={() => setRemoving(person)}>
                Odebrat
              </Button>
            </PersonCard>
          ))}
        </Stack>
      )}

      <ConfirmModal
        opened={removing !== null}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing) remove(removing.handle);
          setRemoving(null);
        }}
        title={`Odebrat @${removing?.handle ?? ""} ze sledujících?`}
        body="Garáž mu zmizí. Nedozví se to a může tě sledovat znovu."
        cancelLabel="Zpět"
        confirmLabel="Odebrat"
      />
    </Stack>
  );
}

export function FollowsVariantCards({ model, tab }: Props): ReactElement {
  return (
    <Stack gap={0} px="md" pt="md" pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {tab === "following" ? <FollowingTab model={model} /> : <FollowersTab model={model} />}
    </Stack>
  );
}
