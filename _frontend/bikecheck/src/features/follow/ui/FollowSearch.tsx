// The search field and, once it has asked, the "Výsledky" panel under it. Owns the typed
// text; the list below it never learns what was typed.
import { useState, type ReactElement } from "react";
import { CloseButton, Loader, Text, TextInput } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import type { TFunction } from "i18next";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { useFollowSearch } from "../follow.queries";
import { normalizeQuery, SEARCH_DEBOUNCE_MS, SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "../followSearch";
import type { FollowSearchResponse } from "../follow.types";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { PersonRow } from "./PersonRow";

const ICON_SIZE = 16;

export function FollowSearch(): ReactElement {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const query = normalizeQuery(typed);
  const askable = query.length >= SEARCH_MIN_LENGTH;
  const [settled] = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const search = useFollowSearch(settled);
  // Busy from the first keystroke past the minimum until the answer to the last one lands.
  const searching = askable && (settled !== query || search.isFetching);

  return (
    <>
      <TextInput
        value={typed}
        onChange={(event) => setTyped(event.currentTarget.value)}
        placeholder={t("follow.searchPlaceholder")}
        maxLength={SEARCH_MAX_LENGTH}
        autoCapitalize="none"
        autoCorrect="off"
        leftSection={<Search size={ICON_SIZE} color="var(--color-text-dim)" />}
        rightSection={
          searching ? (
            <Loader size={14} color="var(--color-text-dim)" />
          ) : typed.length > 0 ? (
            <CloseButton size="sm" c="var(--color-text-dim)" aria-label={t("follow.searchClear")} onClick={() => setTyped("")} />
          ) : null
        }
        styles={inputStyles}
      />

      {askable && (
        <FollowPanel title={resultsTitle(t, search.data)} empty={emptyText(t, search.data, search.isError)}>
          {resultRows(t, search.data)}
        </FollowPanel>
      )}
    </>
  );
}

// "Výsledky · 20+" once the cap was hit; the eyebrow alone before the first answer.
function resultsTitle(t: TFunction, answer: FollowSearchResponse | undefined): string {
  if (answer === undefined) return t("follow.resultsTitle");
  return `${t("follow.resultsTitle")} · ${String(answer.results.length)}${answer.capped ? "+" : ""}`;
}

// What the panel says with no row to show: still waiting, failed, or nobody.
function emptyText(t: TFunction, answer: FollowSearchResponse | undefined, failed: boolean): string {
  if (failed) return t("follow.searchFailed");
  if (answer === undefined) return t("follow.searching");
  return t("follow.noResults");
}

// One row per person found, and after a cut list the line saying it was cut.
function resultRows(t: TFunction, answer: FollowSearchResponse | undefined): ReactElement[] {
  if (answer === undefined) return [];
  const rows = answer.results.map((person) => (
    <PersonRow key={person.handle} person={person}>
      <FollowButton handle={person.handle} visibility={person.visibility} relation={person.relation} size="xs" />
    </PersonRow>
  ));
  if (answer.capped) {
    rows.push(
      <Text key="capped" fz={13} c="var(--color-text-dim)" ta="center" py="xs">
        {t("follow.capped")}
      </Text>,
    );
  }
  return rows;
}
