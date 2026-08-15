// Component group icons. The "?react" suffix has svgr inline each file as a
// component, so it draws in currentColor and takes the usual SVG props.
import type { FunctionComponent, SVGProps } from "react";
import Brakes from "./brakes.svg?react";
import Cockpit from "./cockpit.svg?react";
import Drivetrain from "./drivetrain.svg?react";
import Frame from "./frame.svg?react";
import Misc from "./misc.svg?react";
import Motor from "./motor.svg?react";
import Saddle from "./saddle.svg?react";
import Suspension from "./suspension.svg?react";
import Wheels from "./wheels.svg?react";

export { Brakes, Cockpit, Drivetrain, Frame, Misc, Motor, Saddle, Suspension, Wheels };

export type GroupIcon = FunctionComponent<SVGProps<SVGSVGElement>>;

// Keyed by the seeded group_name — ids are reassigned on every reseed, so they
// cannot address an icon. Renaming a group in the seed means renaming its key
// here too. Three files differ from their group: saddle, motor and misc.
const BY_GROUP_NAME: Record<string, GroupIcon> = {
  Suspension,
  Frame,
  Cockpit,
  "Saddle & Seatpost": Saddle,
  Wheels,
  Drivetrain,
  Brakes,
  "E-bike": Motor,
  Other: Misc,
};

// A group the user created himself has a name of his own, and a seeded one can
// outlive this map — both leave the caller to draw its own fallback.
export function groupIcon(groupName: string): GroupIcon | null {
  return BY_GROUP_NAME[groupName] ?? null;
}
