// PROTOTYPE #128 — variant 3 "Seznam": no cards at all. Rows run edge to edge with a
// hairline between them, the search field sticks under the segment, requests sit in one
// accent band with worded answers. Nothing asks twice: a removed row turns into an undo
// line for a few seconds, then goes.
import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Box, Button, Divider, Group, Stack, Text, UnstyledButton } from "@mantine/core";
import { Users } from "lucide-react";
import { FollowButton, PersonAvatar } from "./FollowButton";
import type { FollowsModel, FollowsTab } from "./follows.model";
import { CAPPED, NO_FOLLOWERS_TITLE, NO_FOLLOWING_HINT, NO_FOLLOWING_TITLE, NO_RESULTS, useNoFollowersHint } from "./followsCopy";
import { SearchInput } from "./FollowsShared";
import type { FollowStatus, Person } from "./people";
import { EYEBROW } from "./shared";

const AVATAR = 44;
// How long the undo line stays before the row is gone for good.
const UNDO_MS = 5000;

interface Props {
  model: FollowsModel;
  tab: FollowsTab;
}

function Row({ person, onOpen, children }: { person: Person; onOpen: () => void; children: ReactNode }): ReactElement {
  return (
    <Group gap="sm" wrap="nowrap" px="md" py={10}>
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

function List({ children }: { children: ReactNode[] }): ReactElement {
  return (
    <Stack gap={0}>
      {children.map((child, index) => (
        <Box key={index}>
          {index > 0 && <Divider color="var(--color-border-subtle)" ml={AVATAR + 28} />}
          {child}
        </Box>
      ))}
    </Stack>
  );
}

function Empty({ title, hint }: { title: string; hint: string }): ReactElement {
  return (
    <Stack align="center" gap="sm" pt="14dvh" px="xl">
      <Users size={32} color="var(--mantine-color-text-9)" />
      <Text fw={600} fz={17} c="text.6" ta="center">
        {title}
      </Text>
      <Text size="sm" c="var(--color-text-dim)" ta="center" style={{ lineHeight: 1.45 }}>
        {hint}
      </Text>
    </Stack>
  );
}

function FollowingTab({ model }: { model: FollowsModel }): ReactElement {
  const { search, following, openProfile } = model;

  let body: ReactNode;
  if (search.results !== null) {
    body =
      search.results.length === 0 ? (
        !search.searching && <Empty title={NO_RESULTS} hint="Zkus jinou část jména nebo adresy." />
      ) : (
        <List>
          {[
            ...search.results.map((person) => (
              <Row key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
                <FollowButton person={person} />
              </Row>
            )),
            ...(search.capped
              ? [
                  <Text key="capped" fz={13} c="var(--color-text-dim)" ta="center" py="sm">
                    {CAPPED}
                  </Text>,
                ]
              : []),
          ]}
        </List>
      );
  } else if (following.length === 0) {
    body = <Empty title={NO_FOLLOWING_TITLE} hint={NO_FOLLOWING_HINT} />;
  } else {
    body = (
      <List>
        {following.map(({ person }) => (
          <Row key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
            <FollowButton person={person} />
          </Row>
        ))}
      </List>
    );
  }

  return (
    <Stack gap={0}>
      {/* Sticks under the header so the field is there however far the list goes. */}
      <Box
        px="md"
        py="sm"
        style={{
          position: "sticky",
          top: "var(--app-shell-header-height, 0px)",
          zIndex: 2,
          backgroundColor: "var(--mantine-color-background-9)",
        }}
      >
        <SearchInput search={search} bare />
      </Box>
      {body}
    </Stack>
  );
}

// A row on its way out: who, what was done, and the way back.
interface Undo {
  person: Person;
  status: FollowStatus;
}

function FollowersTab({ model }: { model: FollowsModel }): ReactElement {
  const { requests, followers, accept, remove, restore, openProfile } = model;
  const hint = useNoFollowersHint();
  const [undo, setUndo] = useState<Undo | null>(null);
  const timer = useRef<number | null>(null);

  // The undo line outlives one render, not the tab: leaving the tab lets it go.
  useEffect(() => {
    if (!undo) return;
    timer.current = window.setTimeout(() => setUndo(null), UNDO_MS);
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [undo]);

  function removeWithUndo(person: Person, status: FollowStatus): void {
    remove(person.handle);
    setUndo({ person, status });
  }

  function undoRow(): ReactElement | null {
    if (!undo) return null;
    return (
      <Group key="undo" gap="sm" wrap="nowrap" px="md" py={12} justify="space-between">
        <Text fz={14} c="var(--color-text-dim)" lineClamp={1}>
          {undo.status === "PENDING" ? "Žádost odmítnuta" : "Odebráno"} · @{undo.person.handle}
        </Text>
        <Button
          variant="subtle"
          color="primary.5"
          size="compact-sm"
          onClick={() => {
            restore(undo.person.handle, undo.status);
            setUndo(null);
          }}
        >
          Vrátit
        </Button>
      </Group>
    );
  }

  if (requests.length === 0 && followers.length === 0 && !undo) {
    return <Empty title={NO_FOLLOWERS_TITLE} hint={hint} />;
  }

  return (
    <Stack gap={0}>
      {requests.length > 0 && (
        // The band is the one coloured thing on the page: it is the only place that asks.
        <Box
          mx="md"
          mt="md"
          mb="sm"
          p="xs"
          style={{
            borderRadius: "1rem",
            backgroundColor: "color-mix(in srgb, var(--mantine-color-primary-6) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--mantine-color-primary-6) 30%, transparent)",
          }}
        >
          <Text {...EYEBROW} c="primary.5" px="xs" pt={4} pb={6}>
            {requests.length === 1 ? "1 žádost o sledování" : `${requests.length} žádosti o sledování`}
          </Text>
          <Stack gap={0}>
            {requests.map((person, index) => (
              <Box key={person.handle}>
                {index > 0 && <Divider color="color-mix(in srgb, var(--mantine-color-primary-6) 20%, transparent)" />}
                <Group gap="sm" wrap="nowrap" px="xs" py={8}>
                  <UnstyledButton onClick={() => openProfile(person.handle)} style={{ flex: 1, minWidth: 0 }}>
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
                  <Button size="xs" radius="xl" color="primary.6" c="textDark.6" onClick={() => accept(person.handle)}>
                    Přijmout
                  </Button>
                  <Button
                    size="xs"
                    radius="xl"
                    variant="subtle"
                    color="text.8"
                    px={8}
                    onClick={() => removeWithUndo(person, "PENDING")}
                  >
                    Odmítnout
                  </Button>
                </Group>
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {(followers.length > 0 || undo) && (
        <Stack gap={0} pt={requests.length > 0 ? 0 : "sm"}>
          <Text {...EYEBROW} px="md" pb={4}>
            Sledující · {followers.length}
          </Text>
          <List>
            {[
              ...(undo ? [undoRow()] : []),
              ...followers.map((person) => (
                <Row key={person.handle} person={person} onOpen={() => openProfile(person.handle)}>
                  <Button variant="subtle" color="text.8" size="compact-sm" onClick={() => removeWithUndo(person, "ACCEPTED")}>
                    Odebrat
                  </Button>
                </Row>
              )),
            ]}
          </List>
        </Stack>
      )}
    </Stack>
  );
}

export function FollowsVariantList({ model, tab }: Props): ReactElement {
  return (
    <Stack gap={0} pb="calc(6rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      {tab === "following" ? <FollowingTab model={model} /> : <FollowersTab model={model} />}
    </Stack>
  );
}
