// SVGR inlines group icons as currentColor React components.
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

// Maps seeded group names because reseeded ids are unstable.
const BY_GROUP_NAME: Record<string, GroupIcon> = {
  Suspension,
  Frame,
  Cockpit,
  "Saddle & Seatpost": Saddle,
  Wheels,
  Drivetrain,
  Brakes,
  "E-bike": Motor,
};

// Unknown groups use the caller's fallback icon.
export function groupIcon(groupName: string): GroupIcon | null {
  return BY_GROUP_NAME[groupName] ?? null;
}
