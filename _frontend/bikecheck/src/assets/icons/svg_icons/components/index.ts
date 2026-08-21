// SVGR inlines component icons as currentColor React components.
import type { FunctionComponent, SVGProps } from "react";
import Axle from "./axle.svg?react";
import Bashguard from "./bashguard.svg?react";
import BottomBracket from "./bottom_bracket.svg?react";
import BrakeCaliper from "./brake_caliper.svg?react";
import BrakeLever from "./brake_lever.svg?react";
import BrakePad from "./brake_pad.svg?react";
import BrakeRotor from "./brake_rotor.svg?react";
import Brakes from "./brakes.svg?react";
import Cassette from "./cassette.svg?react";
import Chain from "./chain.svg?react";
import Chainguide from "./chainguide.svg?react";
import Chainring from "./chainring.svg?react";
import Charger from "./charger.svg?react";
import Crank from "./crank.svg?react";
import CyclePc from "./cycle_pc.svg?react";
import Derailleur from "./derailleur.svg?react";
import Display from "./display.svg?react";
import DropperLever from "./dropper_lever.svg?react";
import Fork from "./fork.svg?react";
import Frame from "./frame.svg?react";
import Grips from "./grips.svg?react";
import Handlebar from "./handlebar.svg?react";
import Hanger from "./hanger.svg?react";
import Headset from "./headset.svg?react";
import Hub from "./hub.svg?react";
import Insert from "./insert.svg?react";
import Motor from "./motor.svg?react";
import Pedals from "./pedals.svg?react";
import Rim from "./rim.svg?react";
import Saddle from "./sadle.svg?react";
import Sealant from "./sealant.svg?react";
import Seatpost from "./seatpost.svg?react";
import Shifter from "./shifter.svg?react";
import Shock from "./shock.svg?react";
import Stem from "./stem.svg?react";
import Tire from "./tire.svg?react";
import Valve from "./valve.svg?react";

export type ComponentIcon = FunctionComponent<SVGProps<SVGSVGElement>>;

// Maps seeded component types; battery and e-bike system borrow related icons.
const BY_COMPONENT_TYPE: Record<string, ComponentIcon> = {
  Axle,
  Bashguard,
  Battery: Charger,
  "Bottom Bracket": BottomBracket,
  "Brake Caliper": BrakeCaliper,
  "Brake Lever": BrakeLever,
  "Brake pad": BrakePad,
  "Brake Rotor": BrakeRotor,
  Brakes,
  Cassette,
  Chain,
  "Chain Guide": Chainguide,
  Chainring,
  Charger,
  Crank,
  Derailleur,
  Display,
  "Dropper Lever": DropperLever,
  "E-Bike System": CyclePc,
  Fork,
  Frame,
  Grips,
  Handlebar,
  Hanger,
  Headset,
  Hub,
  Inserts: Insert,
  Motor,
  Pedals,
  Rim,
  Saddle,
  Sealant,
  Seatpost,
  Shifter,
  Shock,
  Stem,
  Tire,
  Valves: Valve,
};

// Unknown component types use the caller's fallback icon.
export function componentIcon(componentType: string): ComponentIcon | null {
  return BY_COMPONENT_TYPE[componentType] ?? null;
}
