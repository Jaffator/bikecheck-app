// Component group icons. Without vite-plugin-svgr an SVG import is the URL Vite
// emits, so these are plain strings for <img src>, not components.
import brakes from "./brakes.svg";
import cockpit from "./cockpit.svg";
import drivetrain from "./drivetrain.svg";
import frame from "./frame.svg";
import misc from "./misc.svg";
import motor from "./motor.svg";
import saddle from "./saddle.svg";
import suspension from "./suspension.svg";
import wheels from "./wheels.svg";

export { brakes, cockpit, drivetrain, frame, misc, motor, saddle, suspension, wheels };

// Keyed by the seeded group_name — ids are reassigned on every reseed, so they
// cannot address an icon. Renaming a group in the seed means renaming its key
// here too. Three files differ from their group: saddle, motor and misc.
const BY_GROUP_NAME: Record<string, string> = {
  Suspension: suspension,
  Frame: frame,
  Cockpit: cockpit,
  "Saddle & Seatpost": saddle,
  Wheels: wheels,
  Drivetrain: drivetrain,
  Brakes: brakes,
  "E-bike": motor,
  Other: misc,
};

// A group the user created himself has a name of his own, and a seeded one can
// outlive this map — both leave the caller to draw its own fallback.
export function groupIcon(groupName: string): string | null {
  return BY_GROUP_NAME[groupName] ?? null;
}
console.log(groupIcon("Frame"));
