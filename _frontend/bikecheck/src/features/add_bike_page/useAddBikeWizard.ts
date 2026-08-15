// All the state the add-bike wizard carries between its steps, kept out of the
// view so the steps stay renderable from props alone.
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { tapFeedback } from "@/utils/haptics";
import { ApiError } from "@/api/client";
import { useBikeFormOptions, useSearchBikeExternal, useExternalBikeComponents } from "../bikes/bikes.queries";
import type { BikeSearchResult } from "../bikes/bikes.types";
import { useComponentGroups, useDefaultComponents } from "../components/components.queries";
import { isBikeSpecificationComplete, type BikeSpecificationValues } from "./bikeSpecification.types";
import {
  buildInitialEntries,
  entriesAfterSplitToggle,
  entryKey,
  scrapedSplitComponents,
  visibleComponents,
  type ComponentEntries,
  type ComponentPosition,
  type DisabledComponents,
  type SplitComponents,
} from "./bikeComponents.types";

export const TOTAL_STEPS = 3;

export interface AddBikeIdentityValues {
  brand: string;
  model: string;
  year: string | null;
}

export interface AddBikeWizard {
  active: number;
  form: UseFormReturnType<AddBikeIdentityValues>;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  canAdvance: boolean;

  // Step 1 — lookup.
  brandNames: string[];
  brandModels: string[];
  categories: string[];
  canSearch: boolean;
  isSearching: boolean;
  searchResults: BikeSearchResult[] | null;
  searchFailed: boolean;
  showsFallback: boolean;
  searchReplacedForm: boolean;
  diagnosticCode: string;
  selectedBikeUrl: string | null;
  selectBike: (bikeUrl: string | null) => void;
  submitSearch: (values: AddBikeIdentityValues) => void;
  retrySearch: () => void;
  confirmSelection: () => void;
  enterManually: () => void;
  skipStep: () => void;

  // Step 2 — specification.
  confirmedBike: BikeSearchResult | null;
  specification: BikeSpecificationValues;
  changeSpecification: <K extends keyof BikeSpecificationValues>(
    field: K,
    value: BikeSpecificationValues[K],
  ) => void;
  photoUrl: string | null;
  pickPhoto: (file: File | null) => void;

  // Step 3 — components.
  componentGroups: ReturnType<typeof useComponentGroups>["data"];
  defaultComponents: ReturnType<typeof useDefaultComponents>["data"];
  componentEntries: ComponentEntries;
  changeComponentDescription: (
    componentTypeId: number,
    position: ComponentPosition,
    description: string,
  ) => void;
  splitComponents: SplitComponents;
  toggleComponentSplit: (componentTypeId: number) => void;
  disabledComponents: DisabledComponents;
  toggleComponentDisabled: (componentTypeId: number) => void;
  openGroupId: number | null;
  toggleGroup: (groupId: number) => void;
  componentsLoading: boolean;
  componentsError: boolean;
}

export function useAddBikeWizard(): AddBikeWizard {
  const { data: bikeFormOptions } = useBikeFormOptions();
  const searchBike = useSearchBikeExternal();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [selectedBikeUrl, setSelectedBikeUrl] = useState<string | null>(null);
  // Held separately from the search result: going back to step 1 resets the
  // search, and the confirmed pick has to survive that.
  const [confirmedBike, setConfirmedBike] = useState<BikeSearchResult | null>(null);
  // The file is kept for the create call, which lands with the last step; the
  // URL only feeds the preview. Both live here rather than in the step so they
  // survive walking back to step 1.
  const [, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [specification, setSpecification] = useState<BikeSpecificationValues>({
    category: null,
    suspension: null,
    frameSize: null,
    sizeLength: "",
    wheelSize: null,
    ebike: false,
  });
  // Only what the user changed on step 3, keyed by component_type_id — the
  // scraped values underneath stay where they are. Lives here so walking back
  // to step 2 does not throw away what was already described.
  const [componentEdits, setComponentEdits] = useState<ComponentEntries>({});
  // Sided parts the user split or merged by hand, keyed by component_type_id.
  // Separate from the scrape's own verdict so a deliberate merge is not undone
  // when the scrape resolves.
  const [splitOverrides, setSplitOverrides] = useState<Record<number, boolean>>({});
  // Component types the user said his bike does not have. Nothing is written
  // for them, so the part can be added later like any other.
  const [disabledComponents, setDisabledComponents] = useState<ReadonlySet<number>>(new Set());
  // One group open at a time; a phone cannot show two expanded ones.
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);

  const form = useForm<AddBikeIdentityValues>({
    initialValues: {
      brand: "",
      model: "",
      year: null,
    },
  });

  function nextStep(): void {
    tapFeedback();
    setActive((current) => (current < TOTAL_STEPS - 1 ? current + 1 : current));
  }

  // The stepper only walks back over ground already covered — jumping ahead
  // would skip the choices those steps depend on.
  function goToStep(step: number): void {
    if (step > active) return;
    tapFeedback();
    setActive(step);
  }

  // On the first step there is no previous step, so back leaves the wizard —
  // unless the search already replaced the form, in which case back means
  // "return to the search form".
  function prevStep(): void {
    tapFeedback();

    if (active === 0) {
      // The search replaced the form, so back returns to it first.
      if (searchBike.isSuccess || searchBike.isError) {
        setSelectedBikeUrl(null);
        searchBike.reset();
        return;
      }
      navigate(-1);
      return;
    }
    setActive((current) => current - 1);
  }

  // The scraper takes a single search string, so brand and model are joined.
  function submitSearch(values: AddBikeIdentityValues): void {
    tapFeedback();
    searchBike.mutate({
      bikeName: `${values.brand} ${values.model}`.trim(),
      year: values.year ?? "",
    });
  }

  // Only clears the failed result so the form comes back — the user decides
  // when to search again, after correcting brand/model/year.
  function retrySearch(): void {
    searchBike.reset();
  }

  // Locks in the pick from step 1 and moves on to specifying it.
  function confirmSelection(): void {
    const picked = searchBike.data?.find((result) => result.bikeUrl === selectedBikeUrl);
    if (!picked) return;

    setConfirmedBike(picked);
    nextStep();
  }

  // Manual entry and skipping both move on without a specification; the
  // difference is whether the user fills it in on the next step or not.
  function enterManually(): void {
    searchBike.reset();
    nextStep();
  }

  function skipStep(): void {
    searchBike.reset();
    nextStep();
  }

  // Each pick replaces the previous preview, whose object URL would otherwise
  // stay allocated for the life of the document.
  function pickPhoto(file: File | null): void {
    tapFeedback();
    setPhoto(file);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function changeSpecification<K extends keyof BikeSpecificationValues>(
    field: K,
    value: BikeSpecificationValues[K],
  ): void {
    setSpecification((current) => ({ ...current, [field]: value }));
  }

  const brandNames = bikeFormOptions?.bikeBrands.map((brand) => brand.bike_brand) ?? [];
  const brandModels =
    bikeFormOptions?.bikeModels
      .filter((model) => model.brand_id === bikeFormOptions.bikeBrands.find((b) => b.bike_brand === form.values.brand)?.id)
      .map((model) => model.model_name) ?? [];

  // Without a brand and model the scraper would return an unfiltered list.
  const canSearch = form.values.brand.trim().length > 0 && form.values.model.trim().length > 0;

  // The provider answering with an empty list is a success, not an error, so
  // the two outcomes have to be told apart explicitly.
  const searchFailed = searchBike.isError;
  const searchEmpty = searchBike.isSuccess && searchBike.data.length === 0;
  const searchResults = searchBike.isSuccess && searchBike.data.length > 0 ? searchBike.data : null;

  // The backend only reports an HTTP status, so that is what the user can quote
  // back to support — 502 from the scraper, 504 when the provider timed out.
  const diagnosticCode =
    searchBike.error instanceof ApiError ? `ERR_LOOKUP_${searchBike.error.status}` : "ERR_LOOKUP_UNKNOWN";

  // Step 2 feeds the component tracking, so it cannot be left half-answered —
  // every other step advances freely.
  const canAdvance = active !== 1 || isBikeSpecificationComplete(specification);

  const showsFallback = searchFailed || searchEmpty;
  // Once the search replaced the form, the step is no longer "add a bike" but
  // "pick the match" — and the header arrow has somewhere to go inside the
  // page: back to the form, not out of the wizard.
  const searchReplacedForm = active === 0 && (showsFallback || searchResults !== null);

  // Scraping the detail page is slow, so it starts as soon as the pick is
  // confirmed rather than when step 3 finally renders.
  const componentsQuery = useExternalBikeComponents(confirmedBike?.bikeUrl ?? null);
  // Step 3 lists every trackable part, not only the scraped ones — the groups
  // say which category each belongs to, the defaults say what exists at all.
  const groupsQuery = useComponentGroups();
  const defaultComponentsQuery = useDefaultComponents(specification.ebike);

  // The scrape prefills the form and the user's edits are laid over it, so the
  // answers survive the scrape resolving and never have to be copied into state.
  const componentEntries: ComponentEntries = {
    ...buildInitialEntries(componentsQuery.data ?? []),
    ...componentEdits,
  };

  // A split part owns one entry per side, so the edit is addressed by both the
  // type and the field it was typed into.
  function changeComponentDescription(
    componentTypeId: number,
    position: ComponentPosition,
    description: string,
  ): void {
    setComponentEdits((current) => ({
      ...current,
      [entryKey(componentTypeId, position)]: { description },
    }));
  }

  // The scrape decides which parts open split; a toggle overrides that verdict
  // for one type from then on.
  const splitComponents: SplitComponents = new Set(
    [...scrapedSplitComponents(componentsQuery.data ?? [])]
      .filter((typeId) => splitOverrides[typeId] !== false)
      .concat(
        Object.entries(splitOverrides)
          .filter(([, split]) => split)
          .map(([typeId]) => Number(typeId)),
      ),
  );

  function toggleComponentSplit(componentTypeId: number): void {
    const nowSplit = !splitComponents.has(componentTypeId);
    // The fields taking over inherit what the user already typed, so flipping
    // the switch never blanks the part.
    setComponentEdits(entriesAfterSplitToggle(componentEntries, componentTypeId, nowSplit));
    setSplitOverrides((current) => ({ ...current, [componentTypeId]: nowSplit }));
  }

  // Marks a part as absent, or takes it back. What the user typed is kept
  // either way, so re-enabling a part does not blank it.
  function toggleComponentDisabled(componentTypeId: number): void {
    setDisabledComponents((current) => {
      const next = new Set(current);
      if (!next.delete(componentTypeId)) next.add(componentTypeId);
      return next;
    });
  }

  // Tapping the open group closes it, so the list can be collapsed entirely.
  function toggleGroup(groupId: number): void {
    setOpenGroupId((current) => (current === groupId ? null : groupId));
  }

  // pickPhoto frees the URL it replaces, which leaves the last one to free when
  // the wizard goes away. Kept in a ref so this runs on unmount only.
  const photoUrlRef = useRef(photoUrl);

  useEffect(() => {
    photoUrlRef.current = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
    };
  }, []);

  return {
    active,
    form,
    nextStep,
    prevStep,
    goToStep,
    canAdvance,

    brandNames,
    brandModels,
    categories: bikeFormOptions?.bikeTypes ?? [],
    canSearch,
    isSearching: searchBike.isPending,
    searchResults,
    searchFailed,
    showsFallback,
    searchReplacedForm,
    diagnosticCode,
    selectedBikeUrl,
    selectBike: setSelectedBikeUrl,
    submitSearch,
    retrySearch,
    confirmSelection,
    enterManually,
    skipStep,

    confirmedBike,
    specification,
    changeSpecification,
    photoUrl,
    pickPhoto,

    componentGroups: groupsQuery.data,
    // A hardtail is never asked about its shock, so the row is dropped before
    // the step ever sees it.
    defaultComponents: defaultComponentsQuery.data
      ? visibleComponents(defaultComponentsQuery.data, specification.suspension)
      : undefined,
    componentEntries,
    changeComponentDescription,
    splitComponents,
    toggleComponentSplit,
    disabledComponents,
    toggleComponentDisabled,
    openGroupId,
    toggleGroup,
    // Without a scraped bike the scrape query never runs, so it stays pending
    // forever — that is nothing to prefill, not a load in progress. The list
    // itself waits for groups and defaults.
    componentsLoading:
      groupsQuery.isPending ||
      defaultComponentsQuery.isPending ||
      (confirmedBike !== null && componentsQuery.isPending),
    // A failed scrape only costs the prefill; the form itself still works, so
    // only the two lists it is built from can break the step.
    componentsError: groupsQuery.isError || defaultComponentsQuery.isError,
  };
}
