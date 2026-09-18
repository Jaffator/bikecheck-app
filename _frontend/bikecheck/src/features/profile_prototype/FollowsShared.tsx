// PROTOTYPE #128 — throwaway. The one control every variant of the Follows screen draws the
// same way: the search field. Layout stays with each variant.
import type { ReactElement } from "react";
import { CloseButton, Loader, TextInput } from "@mantine/core";
import { Search } from "lucide-react";
import { inputStyles } from "@/features/add_bike_page/formStyles";
import type { SearchState } from "./follows.model";

interface SearchInputProps {
  search: SearchState;
  // Variant 3 runs it edge to edge without the field's own border.
  bare?: boolean;
}

export function SearchInput({ search, bare = false }: SearchInputProps): ReactElement {
  return (
    <TextInput
      value={search.query}
      onChange={(event) => search.setQuery(event.currentTarget.value)}
      placeholder="Jméno nebo @adresa"
      autoCapitalize="none"
      autoCorrect="off"
      leftSection={<Search size={16} color="var(--color-text-dim)" />}
      rightSection={
        search.searching ? (
          <Loader size={14} color="var(--color-text-dim)" />
        ) : search.query.length > 0 ? (
          <CloseButton size="sm" c="var(--color-text-dim)" aria-label="Smazat" onClick={() => search.setQuery("")} />
        ) : null
      }
      styles={{
        ...inputStyles,
        input: bare
          ? { ...inputStyles.input, backgroundColor: "var(--mantine-color-inputs-6)", border: "none", borderRadius: 9999 }
          : inputStyles.input,
      }}
    />
  );
}
