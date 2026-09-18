// PROTOTYPE #128 — winner "Panely": each section is one panel card with hairline rows,
// the way Settings groups its rows. Results come as their own panel above the list, which
// stays where it was. Removing a follower and declining a request both ask in a bottom
// sheet (docs/conventions/drawers.md) that shows who it is about.
import { Fragment, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Button, Divider, Drawer, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { Check, X } from "lucide-react";
import { useOverlayBack } from "@/hooks/useOverlayBack";
import { FollowButton, PersonAvatar } from "./FollowButton";
import type { FollowsModel } from "./follows.model";
import { CAPPED, NO_FOLLOWERS_TITLE, NO_FOLLOWING_HINT, NO_FOLLOWING_TITLE, NO_RESULTS, useNoFollowersHint } from "./followsCopy";
import { SearchInput } from "./FollowsShared";
import type { Person } from "./people";
import { usePrototypeStore } from "./prototype.store";
import { DRAWER_PROPS, EYEBROW, PANEL, SECONDARY_BUTTON } from "./shared";

const AVATAR = 40;

// One panel: eyebrow, then rows split by hairlines. An empty one says so in one dim line.
function Panel({ title, empty, children }: { title: ReactNode; empty?: string; children: ReactNode[] }): ReactElement {
  return (
    <Paper radius="lg" p="md" pt="sm" style={PANEL}>
      <Stack gap={4}>
        <Text {...EYEBROW}>{title}</Text>
        {children.length === 0 ? (
          <Text fz={14} c="var(--color-text-dim)" py="xs">
            {empty}
          </Text>
        ) : (
          children.map((child, index) => (
            <Fragment key={index}>
              {index > 0 && <Divider color="var(--color-border-subtle)" />}
              {child}
            </Fragment>
          ))
        )}
      </Stack>
    </Paper>
  );
}

function PersonRow({ person, onOpen, children }: { person: Person; onOpen: () => void; children: ReactNode }): ReactElement {
  return (
    <Group gap="sm" wrap="nowrap" py={8}>
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
  );
}

// What the sheet asks: to decline a request, or to remove someone already following.
interface Question {
  person: Person;
  act: "decline" | "remove";
}

function QuestionSheet({
  question,
  opened,
  onClose,
  onConfirm,
}: {
  // The last question asked stays for the exit slide; `opened` says whether it still stands.
  question: Question | null;
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
}): ReactElement {
  useOverlayBack(opened, onClose);
  const person = question?.person;
  const decline = question?.act === "decline";

  return (
    <Drawer opened={opened} onClose={onClose} withCloseButton={false} {...DRAWER_PROPS}>
      {person && (
        <Stack align="center" gap="md" pt="sm">
          <PersonAvatar person={person} size={64} />
          <Stack gap={4} align="center">
            <Text fw={700} fz={18} c="text.6">
              {decline ? "Odmítnout žádost?" : "Odebrat ze sledujících?"}
            </Text>
            <Text fz={14} c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
              {person.name} · @{person.handle}
              <br />
              {decline ? "Nedozví se to a může požádat znovu." : "Garáž mu zmizí. Nedozví se to a může tě sledovat znovu."}
            </Text>
          </Stack>
          <Stack gap="sm" w="100%" pt="xs">
            <Button color="red.5" radius="md" fullWidth onClick={onConfirm} styles={{ root: { "--button-color": "black" } as CSSProperties }}>
              {decline ? "Odmítnout" : "Odebrat"}
            </Button>
            <Button variant="subtle" color="text.6" radius="md" fullWidth onClick={onClose}>
              Zpět
            </Button>
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

// Each tab body brings its own page padding, so the swipe track can lay them side by side.
const PAGE_BOTTOM = "calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))";

export function FollowingPanels({ model }: { model: FollowsModel }): ReactElement {
  const { search, following, openProfile } = model;

  return (
    <Stack gap="md" px={8} pt="md" pb={PAGE_BOTTOM}>
      <SearchInput search={search} />
      {search.results !== null && (
        <Panel title={`Výsledky · ${search.results.length}${search.capped ? "+" : ""}`} empty={search.searching ? "Hledám…" : NO_RESULTS}>
          {[
            ...search.results.map((person) => (
              <PersonRow key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
                <FollowButton person={person} />
              </PersonRow>
            )),
            ...(search.capped
              ? [
                  <Text key="capped" fz={13} c="var(--color-text-dim)" ta="center" py="xs">
                    {CAPPED}
                  </Text>,
                ]
              : []),
          ]}
        </Panel>
      )}
      <Panel title={`Sleduješ · ${following.length}`} empty={`${NO_FOLLOWING_TITLE}. ${NO_FOLLOWING_HINT}`}>
        {following.map(({ person }) => (
          <PersonRow key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
            <FollowButton person={person} />
          </PersonRow>
        ))}
      </Panel>
    </Stack>
  );
}

export function FollowersPanels({ model }: { model: FollowsModel }): ReactElement {
  const { requests, followers, accept, remove, openProfile } = model;
  const visibility = usePrototypeStore((state) => state.visibility);
  const hint = useNoFollowersHint();
  const [question, setQuestion] = useState<Question | null>(null);
  const [asking, setAsking] = useState(false);

  function ask(next: Question): void {
    setQuestion(next);
    setAsking(true);
  }

  return (
    <Stack gap="md" px={8} pt="md" pb={PAGE_BOTTOM}>
      {/* Requests only exist while approval does: a public profile has no panel for them. */}
      {visibility !== "PUBLIC" && (
        <Panel
          title={
            <Text {...EYEBROW} c={requests.length > 0 ? "primary.5" : undefined} span>
              Žádosti · {requests.length}
            </Text>
          }
          empty="Žádné čekající žádosti."
        >
          {requests.map((person) => (
            <PersonRow key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
              <ActionIcon variant="filled" color="primary.6" radius="xl" size={32} aria-label="Přijmout" onClick={() => accept(person.handle)}>
                <Check size={16} />
              </ActionIcon>
              <ActionIcon
                variant="default"
                radius="xl"
                size={32}
                aria-label="Odmítnout"
                styles={{ root: SECONDARY_BUTTON }}
                onClick={() => ask({ person, act: "decline" })}
              >
                <X size={16} />
              </ActionIcon>
            </PersonRow>
          ))}
        </Panel>
      )}

      <Panel title={`Sledující · ${followers.length}`} empty={`${NO_FOLLOWERS_TITLE}. ${hint}`}>
        {followers.map((person) => (
          <PersonRow key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
            <Button
              variant="default"
              size="xs"
              radius="xl"
              styles={{ root: { ...SECONDARY_BUTTON, color: "var(--color-text-dim)" } }}
              onClick={() => ask({ person, act: "remove" })}
            >
              Odebrat
            </Button>
          </PersonRow>
        ))}
      </Panel>

      <QuestionSheet
        question={question}
        opened={asking}
        onClose={() => setAsking(false)}
        onConfirm={() => {
          if (question) remove(question.person.handle);
          setAsking(false);
        }}
      />
    </Stack>
  );
}
