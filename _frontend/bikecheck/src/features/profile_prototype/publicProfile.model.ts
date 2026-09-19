// PROTOTYPE #132 — throwaway. What the web page /u/<handle> reads, under the web rule of
// GET /profiles/public/:handle (#116): PUBLIC opens, everything else — OFF, followers only,
// unknown handle, the owner themself — is one closed page. Same mock as /users/* (#129),
// so the drawer's switches change this page too.
import { findPerson } from "./people";
import { garageFor, MY_GARAGE, type MockBike, type MockGarage } from "./profile.mock";
import { usePrototypeStore } from "./prototype.store";

export interface PublicOwner {
  name: string;
  handle: string;
  initials: string;
}

export type PublicView = { kind: "closed" } | { kind: "garage"; owner: PublicOwner; garage: MockGarage };

// The public route has no session, so my own name is a constant here; the real page reads
// it off the profile payload like anyone else's.
const MY_NAME = "Jarda L.";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function usePublicView(handle: string): PublicView {
  const myHandle = usePrototypeStore((state) => state.handle);
  const myVisibility = usePrototypeStore((state) => state.visibility);
  const mySections = usePrototypeStore((state) => state.sections);
  const unsharedBikeIds = usePrototypeStore((state) => state.unsharedBikeIds);

  if (handle === myHandle) {
    if (myVisibility !== "PUBLIC") return { kind: "closed" };
    const bikes = MY_GARAGE.bikes.filter((bike) => !unsharedBikeIds.includes(bike.id));
    return {
      kind: "garage",
      owner: { name: MY_NAME, handle, initials: initials(MY_NAME) },
      garage: { ...MY_GARAGE, bikes, sections: mySections },
    };
  }

  const person = findPerson(handle);
  if (!person || person.visibility !== "PUBLIC") return { kind: "closed" };
  return {
    kind: "garage",
    owner: { name: person.name, handle, initials: initials(person.name) },
    garage: garageFor(handle),
  };
}

export type PublicBikeView =
  { kind: "closed" } | { kind: "bike"; owner: PublicOwner; garage: MockGarage; bike: MockBike };

export function usePublicBikeView(handle: string, bikeId: number): PublicBikeView {
  const view = usePublicView(handle);
  if (view.kind !== "garage") return { kind: "closed" };
  const bike = view.garage.bikes.find((item) => item.id === bikeId);
  if (!bike) return { kind: "closed" };
  return { kind: "bike", owner: view.owner, garage: view.garage, bike };
}

export function garagePath(handle: string): string {
  return `/u/${handle}`;
}

export function bikePath(handle: string, bikeId: number): string {
  return `/u/${handle}/${bikeId}`;
}
