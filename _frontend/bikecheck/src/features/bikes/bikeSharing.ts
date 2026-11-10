import type { Bike } from "@/features/bikes/bikes.types";
import type { Profile, ProfileVisibility } from "@/features/profile/profile.types";

// To whom the bike shows on the owner's profile, or null when it shows to no one. Archiving
// leaves the switch alone, yet an archived bike is off the profile whatever it says.
export function profileVisibilityOf(bike: Bike, profile: Profile | undefined): ProfileVisibility | null {
  if (!bike.is_shared || bike.is_deleted === true) return null;
  if (profile === undefined || profile.visibility === "OFF") return null;
  return profile.visibility;
}
