import { useEffect, useRef, useState } from "react";
import { useForm, type UseFormReturnType } from "@mantine/form";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";
import { tapFeedback } from "@/utils/haptics";
import { ApiError } from "@/api/client";
import { useBikeFormOptions, useSearchBikeExternal, useExternalBikeComponents, useCreateBike } from "../bikes/bikes.queries";
import type { BikeSearchResult, CreateBikePayload } from "../bikes/bikes.types";
import { getStravaAuthorizeUrl } from "../strava/strava.api";
import { useCurrentUser } from "../users/users.queries";
import type { AssembleBikeComponent } from "../components/components.types";
import { useComponentGroups, useDefaultComponents } from "../components/components.queries";
import { isBikeSpecificationComplete, type BikeSpecificationValues, type SuspensionLayout } from "./bikeSpecification.types";
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

  confirmedBike: BikeSearchResult | null;
  specification: BikeSpecificationValues;
  changeSpecification: <K extends keyof BikeSpecificationValues>(field: K, value: BikeSpecificationValues[K]) => void;
  photoUrl: string | null;
  photo: File | null;
  pickPhoto: (file: File | null) => void;
  photoToCrop: File | null;
  photoToCropUrl: string | null;
  cancelCrop: () => void;
  confirmCrop: (cropped: File) => void;

  componentGroups: ReturnType<typeof useComponentGroups>["data"];
  defaultComponents: ReturnType<typeof useDefaultComponents>["data"];
  componentEntries: ComponentEntries;
  changeComponentDescription: (componentTypeId: number, position: ComponentPosition, description: string) => void;
  splitComponents: SplitComponents;
  toggleComponentSplit: (componentTypeId: number) => void;
  disabledComponents: DisabledComponents;
  toggleComponentDisabled: (componentTypeId: number) => void;
  openGroupId: number | null;
  toggleGroup: (groupId: number) => void;
  componentsLoading: boolean;
  componentsError: boolean;

  summaryOpen: boolean;
  openSummary: () => void;
  closeSummary: () => void;
  componentsToSave: AssembleBikeComponent[];
  saveBike: () => void;
  isSaving: boolean;
  saveFailed: boolean;
  saveErrorDetails: string[];

  savedBike: boolean;
  savedBikeName: string;
  savedBikeId: number | null;
  offeringStrava: boolean;
  pairingGear: boolean;
  closeGearPairing: () => void;
  leaveAfterSave: () => void;
  connectingStrava: boolean;
  connectStrava: () => Promise<void>;
}

// Map wizard suspension layouts to persisted axle flags.
const SUSPENSION_FLAGS: Record<SuspensionLayout, { front: boolean; rear: boolean }> = {
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
  const [confirmedBike, setConfirmedBike] = useState<BikeSearchResult | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
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
  const [componentEdits, setComponentEdits] = useState<ComponentEntries>({});
  const [splitOverrides, setSplitOverrides] = useState<Record<number, boolean>>({});
  const [disabledComponents, setDisabledComponents] = useState<ReadonlySet<number>>(new Set());
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [sentComponents, setSentComponents] = useState<AssembleBikeComponent[]>([]);
  const [savedBike, setSavedBike] = useState(false);
  const [offeringStrava, setOfferingStrava] = useState(false);
  const [pairingGear, setPairingGear] = useState(false);
  const [savedBikeId, setSavedBikeId] = useState<number | null>(null);
  const { data: currentUser } = useCurrentUser();
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

  function goToStep(step: number): void {
    if (step > active) return;
    tapFeedback();
    setActive(step);
  }

  function prevStep(): void {
    tapFeedback();

    if (active === 0) {
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

  function submitSearch(values: AddBikeIdentityValues): void {
    tapFeedback();
    searchBike.mutate({
      bikeName: `${values.brand} ${values.model}`.trim(),
      year: values.year ?? "",
    });
  }

  function retrySearch(): void {
    searchBike.reset();
  }

  function confirmSelection(): void {
    const picked = searchBike.data?.find((result) => result.bikeUrl === selectedBikeUrl);
    if (!picked) return;

    setConfirmedBike(picked);
    nextStep();
  }

  function enterManually(): void {
    searchBike.reset();
    nextStep();
  }

  function skipStep(): void {
    searchBike.reset();
    nextStep();
  }

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

  function applyPhoto(file: File | null): void {
    setPhoto(file);
    setPhotoUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  function cancelCrop(): void {
    setPhotoToCropUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setPhotoToCrop(null);
  }

  function confirmCrop(cropped: File): void {
    applyPhoto(cropped);
    cancelCrop();
  }

  function changeSpecification<K extends keyof BikeSpecificationValues>(field: K, value: BikeSpecificationValues[K]): void {
    setSpecification((current) => ({ ...current, [field]: value }));
  }

  const brandNames = bikeFormOptions?.bikeBrands.map((brand) => brand.bike_brand) ?? [];
  const brandModels =
    bikeFormOptions?.bikeModels
      .filter((model) => model.brand_id === bikeFormOptions.bikeBrands.find((b) => b.bike_brand === form.values.brand)?.id)
      .map((model) => model.model_name) ?? [];

  const canSearch = form.values.brand.trim().length > 0 && form.values.model.trim().length > 0;

  const searchFailed = searchBike.isError;
  const searchEmpty = searchBike.isSuccess && searchBike.data.length === 0;
  const searchResults = searchBike.isSuccess && searchBike.data.length > 0 ? searchBike.data : null;

  const diagnosticCode =
    searchBike.error instanceof ApiError ? `ERR_LOOKUP_${searchBike.error.status}` : "ERR_LOOKUP_UNKNOWN";

  const canAdvance = active === 0 ? canSearch : active !== 1 || isBikeSpecificationComplete(specification);

  const showsFallback = searchFailed || searchEmpty;
  const searchReplacedForm = active === 0 && (showsFallback || searchResults !== null);

  const componentsQuery = useExternalBikeComponents(confirmedBike?.bikeUrl ?? null);
  const groupsQuery = useComponentGroups();
  const defaultComponentsQuery = useDefaultComponents(specification.ebike);

  const componentEntries: ComponentEntries = {
    ...buildInitialEntries(componentsQuery.data ?? []),
    ...componentEdits,
  };

  function changeComponentDescription(componentTypeId: number, position: ComponentPosition, description: string): void {
    setComponentEdits((current) => ({
      ...current,
      [entryKey(componentTypeId, position)]: { description },
    }));
  }

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
    setComponentEdits(entriesAfterSplitToggle(componentEntries, componentTypeId, nowSplit));
    setSplitOverrides((current) => ({
      ...current,
      [componentTypeId]: nowSplit,
    }));
  }

  function toggleComponentDisabled(componentTypeId: number): void {
    setDisabledComponents((current) => {
      const next = new Set(current);
      if (!next.delete(componentTypeId)) next.add(componentTypeId);
      return next;
    });
  }

  function toggleGroup(groupId: number): void {
    setOpenGroupId((current) => (current === groupId ? null : groupId));
  }

  const componentsToSave = defaultComponentsQuery.data
    ? toMountedComponents(
        componentEntries,
        visibleComponents(defaultComponentsQuery.data, specification.suspension),
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

  function parsedYear(): number | undefined {
    const year = Number(form.values.year);
    return Number.isInteger(year) && year > 0 ? year : undefined;
  }

  function buildBikePayload(): CreateBikePayload {
    const suspension = SUSPENSION_FLAGS[specification.suspension ?? "none"];
    const bikeSize =
      specification.frameSize === "other" ? specification.sizeLength.trim() : (specification.frameSize ?? undefined);

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
      total_km: specification.currentMileage ? Number(specification.currentMileage) : undefined,
      bike_type: specification.category ?? undefined,
      image_url: confirmedBike?.imageUrl ? String(confirmedBike.imageUrl) : undefined,
    };
  }

  function saveBike(): void {
    tapFeedback();
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
        onSuccess: (bike) => {
          setSummaryOpen(false);
          setSavedBike(true);
          setSavedBikeId(bike.id);
        },
      },
    );
  }

  function namedSaveErrors(): string[] {
    if (!(createBike.error instanceof ApiError)) return [];

    return createBike.error.details.map((detail) => {
      const match = /^components\.(\d+)\.(\w+):\s*(.*)$/.exec(detail);
      if (!match) return detail;

      const [, index, , reason] = match;
      const component = sentComponents[Number(index)];
      if (!component) return detail;

      const name = component.component_i18n_key ? t(component.component_i18n_key) : component.component_name;
      const position = component.component.position;
      const side =
        position === "front" || position === "rear"
          ? ` (${t(`addBike.position${position === "front" ? "Front" : "Rear"}`)})`
          : "";

      return `${name}${side}: ${reason}`;
    });
  }

  // Retain preview URLs for unmount cleanup.
  const photoUrlRef = useRef(photoUrl);
  const photoToCropUrlRef = useRef(photoToCropUrl);

  useEffect(() => {
    photoUrlRef.current = photoUrl;
    photoToCropUrlRef.current = photoToCropUrl;
  }, [photoUrl, photoToCropUrl]);

  useEffect(() => {
    return () => {
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      if (photoToCropUrlRef.current) URL.revokeObjectURL(photoToCropUrlRef.current);
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
    componentsLoading:
      groupsQuery.isPending || defaultComponentsQuery.isPending || (confirmedBike !== null && componentsQuery.isPending),
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
      [form.values.brand.trim(), form.values.model.trim()].filter((part) => part !== "").join(" "),
    savedBikeId,
    offeringStrava,
    pairingGear,
    closeGearPairing: () => {
      setPairingGear(false);
      navigate("/bikes");
    },
    // Continue to pairing when Strava is linked; otherwise offer connection.
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
    connectStrava: async () => {
      setConnectingStrava(true);
      try {
        const { url } = await getStravaAuthorizeUrl();
        await Browser.open({ url });
      } catch {
        setConnectingStrava(false);
        navigate("/bikes");
      }
    },
  };
}
