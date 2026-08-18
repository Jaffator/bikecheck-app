// All the state the add-bike wizard carries between its steps, kept out of the
// view so the steps stay renderable from props alone.
import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";
import { tapFeedback } from "@/utils/haptics";
import { ApiError } from "@/api/client";
import {
  useBikeFormOptions,
  useSearchBikeExternal,
  useExternalBikeComponents,
  useCreateBike,
} from "../bikes/bikes.queries";
import type { BikeSearchResult, CreateBikePayload } from "../bikes/bikes.types";
import { getStravaAuthorizeUrl } from "../strava/strava.api";
import { useCurrentUser } from "../users/users.queries";
import type { AssembleBikeComponent } from "../components/components.types";
import {
  useComponentGroups,
  useDefaultComponents,
} from "../components/components.queries";
import {
  isBikeSpecificationComplete,
  type BikeSpecificationValues,
  type SuspensionLayout,
} from "./bikeSpecification.types";
import {
  buildInitialEntries,
  entriesAfterSplitToggle,
  entryKey,
  scrapedSplitComponents,
  toMountedComponents,
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
  // The file itself goes to the create call; photoUrl only feeds the preview.
  photo: File | null;
  // A pick opens the crop step rather than landing straight on the bike, so the
  // photo is framed to the shape the app shows it in.
  pickPhoto: (file: File | null) => void;
  // The photo waiting to be framed, and its preview URL.
  photoToCrop: File | null;
  photoToCropUrl: string | null;
  cancelCrop: () => void;
  confirmCrop: (cropped: File) => void;

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

  // Saving — the summary confirms what step 3 assembled before it is written.
  summaryOpen: boolean;
  openSummary: () => void;
  closeSummary: () => void;
  // What the create call will actually write, already reduced: absent parts
  // dropped, sided parts expanded into one record per side.
  componentsToSave: AssembleBikeComponent[];
  saveBike: () => void;
  isSaving: boolean;
  saveFailed: boolean;
  // What the server said was wrong, so a rejected save can be corrected instead
  // of only reporting that it failed.
  saveErrorDetails: string[];

  // The bike is written and the wizard has given way to its confirmation.
  savedBike: boolean;
  // What to call the saved bike on that screen: its own name if the user gave
  // one, otherwise brand and model.
  savedBikeName: string;
  // The id the backend gave the saved bike, so it can be paired with Strava gear.
  savedBikeId: number | null;
  // The confirmation is done with and the Strava offer has taken over. Only ever
  // true without a linked account — with one there is nothing left to offer.
  offeringStrava: boolean;
  // The confirmation is done with and the gear pairing sheet is up.
  pairingGear: boolean;
  closeGearPairing: () => void;
  leaveAfterSave: () => void;
  // True while the authorize URL is being fetched, before the redirect leaves.
  connectingStrava: boolean;
  // Starts the sync: fetches the authorize URL and sends the browser to Strava.
  connectStrava: () => Promise<void>;
}

// The step asks for one of three layouts, but a bike stores the two ends
// independently.
const SUSPENSION_FLAGS: Record<
  SuspensionLayout,
  { front: boolean; rear: boolean }
> = {
  full: { front: true, rear: true },
  hardtail: { front: true, rear: false },
  none: { front: false, rear: false },
};

export function useAddBikeWizard(): AddBikeWizard {
  const { t } = useTranslation();
  const { data: bikeFormOptions } = useBikeFormOptions();
  const searchBike = useSearchBikeExternal();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [selectedBikeUrl, setSelectedBikeUrl] = useState<string | null>(null);
  // Held separately from the search result: going back to step 1 resets the
  // search, and the confirmed pick has to survive that.
  const [confirmedBike, setConfirmedBike] = useState<BikeSearchResult | null>(
    null,
  );
  // The file is kept for the create call, which lands with the last step; the
  // URL only feeds the preview. Both live here rather than in the step so they
  // survive walking back to step 1.
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  // A pick waiting to be framed. Held apart from the photo above so backing out
  // of the crop leaves the previous photo untouched.
  const [photoToCrop, setPhotoToCrop] = useState<File | null>(null);
  const [photoToCropUrl, setPhotoToCropUrl] = useState<string | null>(null);
  const [specification, setSpecification] = useState<BikeSpecificationValues>({
    bikeName: "",
    currentMileage: "",
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
  const [splitOverrides, setSplitOverrides] = useState<Record<number, boolean>>(
    {},
  );
  // Component types the user said his bike does not have. Nothing is written
  // for them, so the part can be added later like any other.
  const [disabledComponents, setDisabledComponents] = useState<
    ReadonlySet<number>
  >(new Set());
  // One group open at a time; a phone cannot show two expanded ones.
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  // The save goes through a summary first, so the last step confirms what the
  // earlier ones collected instead of writing blind.
  const [summaryOpen, setSummaryOpen] = useState(false);
  // The list as it was actually sent. A rejected component is reported by its
  // index in that payload, and the live list is recomputed on every render — so
  // resolving an index against it can miss.
  const [sentComponents, setSentComponents] = useState<AssembleBikeComponent[]>(
    [],
  );
  // Set once the bike is written: the wizard is replaced by its confirmation,
  // which owns the only way onwards from here.
  const [savedBike, setSavedBike] = useState(false);
  // Continuing from the confirmation offers the Strava sync rather than leaving
  // straight for the garage — the mileage the app reasons about comes from
  // rides, and this is the moment the user has a bike to sync.
  const [offeringStrava, setOfferingStrava] = useState(false);
  const [pairingGear, setPairingGear] = useState(false);
  const [savedBikeId, setSavedBikeId] = useState<number | null>(null);
  // Decides which of the two follow-ups the confirmation leads to.
  const { data: currentUser } = useCurrentUser();
  // The authorize URL is fetched on tap, so the button has to say it is working
  // — the redirect only happens once the backend answers.
  const [connectingStrava, setConnectingStrava] = useState(false);
  const createBike = useCreateBike();

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
    const picked = searchBike.data?.find(
      (result) => result.bikeUrl === selectedBikeUrl,
    );
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

  // A picked photo is staged for framing rather than used as it is: a phone
  // shoots 4:3 portrait and the app shows a wide strip, so without a crop the
  // bike becomes a slice of its own photo. Clearing the pick (file === null)
  // clears the photo outright, which is how "remove" still works.
  function pickPhoto(file: File | null): void {
    tapFeedback();
    if (!file) {
      setPhotoToCropUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      setPhotoToCrop(null);
      applyPhoto(null);
      return;
    }

    setPhotoToCrop(file);
    setPhotoToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  // Each photo replaces the previous preview, whose object URL would otherwise
  // stay allocated for the life of the document.
  function applyPhoto(file: File | null): void {
    setPhoto(file);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  // Backing out of the crop leaves whatever photo was already there, so a bad
  // pick does not also throw away a good earlier one.
  function cancelCrop(): void {
    setPhotoToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPhotoToCrop(null);
  }

  // Only the cropped file is kept — the original was never the one being sent.
  function confirmCrop(cropped: File): void {
    applyPhoto(cropped);
    cancelCrop();
  }

  function changeSpecification<K extends keyof BikeSpecificationValues>(
    field: K,
    value: BikeSpecificationValues[K],
  ): void {
    setSpecification((current) => ({ ...current, [field]: value }));
  }

  const brandNames =
    bikeFormOptions?.bikeBrands.map((brand) => brand.bike_brand) ?? [];
  const brandModels =
    bikeFormOptions?.bikeModels
      .filter(
        (model) =>
          model.brand_id ===
          bikeFormOptions.bikeBrands.find(
            (b) => b.bike_brand === form.values.brand,
          )?.id,
      )
      .map((model) => model.model_name) ?? [];

  // Without a brand and model the scraper would return an unfiltered list.
  const canSearch =
    form.values.brand.trim().length > 0 && form.values.model.trim().length > 0;

  // The provider answering with an empty list is a success, not an error, so
  // the two outcomes have to be told apart explicitly.
  const searchFailed = searchBike.isError;
  const searchEmpty = searchBike.isSuccess && searchBike.data.length === 0;
  const searchResults =
    searchBike.isSuccess && searchBike.data.length > 0 ? searchBike.data : null;

  // The backend only reports an HTTP status, so that is what the user can quote
  // back to support — 502 from the scraper, 504 when the provider timed out.
  const diagnosticCode =
    searchBike.error instanceof ApiError
      ? `ERR_LOOKUP_${searchBike.error.status}`
      : "ERR_LOOKUP_UNKNOWN";

  // Step 2 feeds the component tracking, so it cannot be left half-answered —
  // every other step advances freely.
  const canAdvance = active !== 1 || isBikeSpecificationComplete(specification);

  const showsFallback = searchFailed || searchEmpty;
  // Once the search replaced the form, the step is no longer "add a bike" but
  // "pick the match" — and the header arrow has somewhere to go inside the
  // page: back to the form, not out of the wizard.
  const searchReplacedForm =
    active === 0 && (showsFallback || searchResults !== null);

  // Scraping the detail page is slow, so it starts as soon as the pick is
  // confirmed rather than when step 3 finally renders.
  const componentsQuery = useExternalBikeComponents(
    confirmedBike?.bikeUrl ?? null,
  );
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
    setComponentEdits(
      entriesAfterSplitToggle(componentEntries, componentTypeId, nowSplit),
    );
    setSplitOverrides((current) => ({
      ...current,
      [componentTypeId]: nowSplit,
    }));
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

  // What step 3 collected, reduced to the records the create call will write.
  const componentsToSave = defaultComponentsQuery.data
    ? toMountedComponents(
        componentEntries,
        visibleComponents(
          defaultComponentsQuery.data,
          specification.suspension,
        ),
        splitComponents,
        disabledComponents,
      )
    : [];

  function openSummary(): void {
    tapFeedback();
    setSummaryOpen(true);
  }

  function closeSummary(): void {
    setSummaryOpen(false);
  }

  // The year is free text on the form but a number on the bike; anything that
  // is not a year is left unset rather than sent as NaN.
  function parsedYear(): number | undefined {
    const year = Number(form.values.year);
    return Number.isInteger(year) && year > 0 ? year : undefined;
  }

  function buildBikePayload(): CreateBikePayload {
    const suspension = SUSPENSION_FLAGS[specification.suspension ?? "none"];
    // A letter size answers the frame size on its own; "other" is when the free
    // text is what the user actually gave.
    const bikeSize =
      specification.frameSize === "other"
        ? specification.sizeLength.trim()
        : (specification.frameSize ?? undefined);

    return {
      bike_brand: form.values.brand.trim(),
      ebike: specification.ebike,
      has_front_suspension: suspension.front,
      has_rear_suspension: suspension.rear,
      bike_model: form.values.model.trim() || undefined,
      bikename: specification.bikeName.trim() || undefined,
      year: parsedYear(),
      wheel_size: specification.wheelSize ?? undefined,
      bike_size: bikeSize || undefined,
      // Digits only from the input, so an empty field means "not given" rather
      // than zero kilometres.
      total_km: specification.currentMileage
        ? Number(specification.currentMileage)
        : undefined,
      // The category the user picked on step 2 is the bike type's name; the
      // backend turns it into bike_type_id, which the default service intervals
      // are keyed off.
      bike_type: specification.category ?? undefined,
      // The scraped photo travels as a URL; a photo picked on the device is
      // uploaded as a file instead and overrides it on the backend.
      image_url: confirmedBike?.imageUrl
        ? String(confirmedBike.imageUrl)
        : undefined,
    };
  }

  function saveBike(): void {
    tapFeedback();
    // Frozen here so an error can be traced back to the exact list that was
    // sent, whatever the live one looks like by the time the error arrives.
    const sent = componentsToSave;
    setSentComponents(sent);

    createBike.mutate(
      {
        bike: buildBikePayload(),
        components: sent.map((component) => ({
          component_type_id: component.component.component_type_id,
          component_desc: component.component.component_desc,
          position: component.component.position,
        })),
        image: photo,
      },
      {
        onSuccess: () => {
          // The wizard gives way to its own confirmation rather than dropping
          // the user back on the dashboard with nothing to show for the work.
          setSummaryOpen(false);
          setSavedBike(true);
          setSavedBikeId(bike.id);
        },
      },
    );
  }

  // The backend addresses a rejected component by its position in the payload
  // ("components.21.component_desc"), which says nothing to the user. Only the
  // wizard knows what sits at that index, so the name is put back here.
  function namedSaveErrors(): string[] {
    if (!(createBike.error instanceof ApiError)) return [];

    return createBike.error.details.map((detail) => {
      const match = /^components\.(\d+)\.(\w+):\s*(.*)$/.exec(detail);
      if (!match) return detail;

      const [, index, , reason] = match;
      const component = sentComponents[Number(index)];
      if (!component) return detail;

      const name = component.component_i18n_key
        ? t(component.component_i18n_key)
        : component.component_name;
      const position = component.component.position;
      const side =
        position === "front" || position === "rear"
          ? ` (${t(`addBike.position${position === "front" ? "Front" : "Rear"}`)})`
          : "";

      return `${name}${side}: ${reason}`;
    });
  }

  // Each handler frees the URL it replaces, which leaves the last of each to
  // free when the wizard goes away — including a crop abandoned by leaving the
  // page. Kept in a ref so this runs on unmount only.
  const photoUrlRef = useRef(photoUrl);
  const photoToCropUrlRef = useRef(photoToCropUrl);

  useEffect(() => {
    photoUrlRef.current = photoUrl;
    photoToCropUrlRef.current = photoToCropUrl;
  }, [photoUrl, photoToCropUrl]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      if (photoToCropUrlRef.current)
        URL.revokeObjectURL(photoToCropUrlRef.current);
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
    photo,
    pickPhoto,
    photoToCrop,
    photoToCropUrl,
    cancelCrop,
    confirmCrop,

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

    summaryOpen,
    openSummary,
    closeSummary,
    componentsToSave,
    saveBike,
    isSaving: createBike.isPending,
    saveFailed: createBike.isError,
    saveErrorDetails: namedSaveErrors(),

    savedBike,
    savedBikeName:
      specification.bikeName.trim() ||
      [form.values.brand.trim(), form.values.model.trim()]
        .filter((part) => part !== "")
        .join(" "),
    savedBikeId,
    offeringStrava,
    pairingGear,
    closeGearPairing: () => {
      setPairingGear(false);
      navigate("/bikes");
    },
    // Continuing from the confirmation branches on whether Strava is already
    // linked: with an account the bike can be paired straight away, without one
    // the offer to connect comes first. Either way the step after that is the
    // garage — neither follow-up has anything behind it.
    leaveAfterSave: () => {
      if (offeringStrava) {
        navigate("/bikes");
        return;
      }
      if (currentUser?.strava_athlete_id) {
        setPairingGear(true);
        return;
      }
      setOfferingStrava(true);
    },
    connectingStrava,
    // Opens Strava's consent screen. The URL has to come from the backend: it
    // carries a single-use state that ties the callback back to this user, which
    // is the whole reason the client cannot assemble it itself.
    connectStrava: async () => {
      setConnectingStrava(true);
      try {
        const { url } = await getStravaAuthorizeUrl();
        // A browser tab over the app, not a navigation away from it: the WebView
        // would otherwise leave the app for good, and the OAuth callback lands
        // on the backend rather than anywhere React could take over again.
        await Browser.open({ url });
      } catch {
        // Nothing was linked, so the garage is still the right place to land.
        setConnectingStrava(false);
        navigate("/bikes");
      }
    },
  };
}
