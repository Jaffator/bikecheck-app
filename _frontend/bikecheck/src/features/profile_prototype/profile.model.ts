// PROTOTYPE #129 — throwaway. What the profile screens read: who the rider is, where I
// stand with them, and the garage — or the reason there is none. Mirrors the reading rule
// of GET /profiles/:handle (#126): the owner always reads their own, a Followers-only
// profile shows only its header until I am accepted, OFF and unknown are one 404.
import { useCurrentUser } from "@/features/users/users.queries";
import { findPerson, type FollowStatus, type Person } from "./people";
import { garageFor, MY_GARAGE, type MockBike, type MockGarage } from "./profile.mock";
import { usePrototypeStore } from "./prototype.store";

export type ProfileView =
  | { kind: "missing" }
  // Discoverable, but the garage is behind approval I do not have (garage: null).
  | { kind: "locked"; person: Person; relation: FollowStatus | null }
  | { kind: "garage"; person: Person; relation: FollowStatus | null; garage: MockGarage; owner: boolean };

export function useProfileView(handle: string): ProfileView {
  const myHandle = usePrototypeStore((state) => state.handle);
  const myVisibility = usePrototypeStore((state) => state.visibility);
  const mySections = usePrototypeStore((state) => state.sections);
  const following = usePrototypeStore((state) => state.following);
  const { data: user } = useCurrentUser();

  // My own address is a preview: read in every state, even OFF (#126).
  if (handle === myHandle) {
    const me: Person = { handle, name: user?.name ?? "Já", visibility: myVisibility };
    return { kind: "garage", person: me, relation: null, garage: { ...MY_GARAGE, sections: mySections }, owner: true };
  }

  const person = findPerson(handle);
  if (!person || person.visibility === "OFF") return { kind: "missing" };

  const relation = following[handle] ?? null;
  if (person.visibility === "FOLLOWERS" && relation !== "ACCEPTED") return { kind: "locked", person, relation };

  return { kind: "garage", person, relation, garage: garageFor(handle), owner: false };
}

export type BikeView = { kind: "missing" } | { kind: "bike"; person: Person; garage: MockGarage; bike: MockBike; owner: boolean };

// The bike page has no header exception (#126): anything short of a readable garage is 404.
export function useBikeView(handle: string, bikeId: number): BikeView {
  const profile = useProfileView(handle);
  if (profile.kind !== "garage") return { kind: "missing" };
  const bike = profile.garage.bikes.find((item) => item.id === bikeId);
  if (!bike) return { kind: "missing" };
  return { kind: "bike", person: profile.person, garage: profile.garage, bike, owner: profile.owner };
}
