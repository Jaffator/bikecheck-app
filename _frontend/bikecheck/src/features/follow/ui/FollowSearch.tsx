// The search field and, once it has asked, the "Výsledky" panel under it. Owns the typed
// text; the list below it never learns what was typed. Desktop splits the two: the field in
// the header, the results in the card.
import { useState, type CSSProperties, type ReactElement } from "react";
import { CloseButton, Loader, Text, TextInput } from "@mantine/core";
import type { TFunction } from "i18next";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import { SEARCH_MAX_LENGTH } from "../followSearch";
import type { FollowSearchResponse } from "../follow.types";
import { useTypedFollowSearch } from "../useTypedFollowSearch";
import { FollowButton } from "./FollowButton";
import { FollowPanel } from "./FollowPanel";
import { PersonRow } from "./PersonRow";

const ICON_SIZE = 16;

export function FollowSearch(): ReactElement {
  const [typed, setTyped] = useState("");
  const { askable, searching, search } = useTypedFollowSearch(typed);

  return (
    <>
      <FollowSearchField value={typed} onChange={setTyped} searching={searching} />
      {askable && <FollowSearchResults answer={search.data} failed={search.isError} />}
    </>
  );
}

interface FollowSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  searching: boolean;
  style?: CSSProperties;
}

export function FollowSearchField({ value, onChange, searching, style }: FollowSearchFieldProps): ReactElement {
  const { t } = useTranslation();

  return (
    <TextInput
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
      placeholder={t("follow.searchPlaceholder")}
      maxLength={SEARCH_MAX_LENGTH}
      autoCapitalize="none"
      autoCorrect="off"
      leftSection={<Search size={ICON_SIZE} color="var(--color-text-dim)" />}
      rightSection={
        searching ? (
          <Loader size={14} color="var(--color-text-dim)" />
        ) : value.length > 0 ? (
          <CloseButton size="sm" c="var(--color-text-dim)" aria-label={t("follow.searchClear")} onClick={() => onChange("")} />
        ) : null
      }
      styles={inputStyles}
      style={style}
    />
  );
}

interface FollowSearchResultsProps {
  answer: FollowSearchResponse | undefined;
  failed: boolean;
}

export function FollowSearchResults({ answer, failed }: FollowSearchResultsProps): ReactElement {
  const { t } = useTranslation();

  return (
    <FollowPanel title={resultsTitle(t, answer)} empty={emptyText(t, answer, failed)}>
      {resultRows(t, answer)}
    </FollowPanel>
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
