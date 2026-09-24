// The destinations the tab bar and the desktop sidebar share. Its own file, so both
// component files export only components and keep Fast Refresh.
import { House, LayoutGrid, Route } from "lucide-react";
import type { IconType } from "react-icons";
import { bikecheckIconType } from "@/assets/icons/bikecheck";

const BikeIcon = bikecheckIconType("BikeIcon");
const BikeIconFill = bikecheckIconType("BikeIcon_fill");
const BikecheckIcon = bikecheckIconType("Bikecheck")!;
const BikecheckOutlineIcon = bikecheckIconType("Bikecheck_outline")!;

export interface NavItem {
  labelKey: string;
  // The tab that opens the More sheet has no route of its own.
  path: string | null;
  icon: IconType;
  // The app's own marks have a filled twin for the active tab; a lucide icon thickens instead.
  icon_fill?: IconType;
}

// Stroke widths for the lucide tabs: the resting one matches the app's own outline marks,
// the active one carries the weight the filled twins carry.
export const TAB_STROKE = 1.75;
export const TAB_STROKE_ACTIVE = 2.5;

// Defines available navigation tabs by stable route paths. Every third-party icon is lucide,
// the family the rest of the app draws with, so the bar no longer mixes three stroke weights.
export const NAV_ITEMS: NavItem[] = [
  { labelKey: "nav.home", path: "/", icon: House as IconType },
  {
    labelKey: "nav.bikes",
    path: "/bikes",
    icon: BikeIcon!,
    icon_fill: BikeIconFill!,
  },
  {
    labelKey: "nav.service",
    path: "/service",
    // Uses the service tab outline icon.
    icon: BikecheckOutlineIcon,
    icon_fill: BikecheckIcon,
  },
  { labelKey: "nav.rides", path: "/rides", icon: Route as IconType },
  // Riders and the chat have no tab of their own; this one opens the sheet that holds
  // both (docs/ui/follows-entry.md).
  { labelKey: "nav.more", path: null, icon: LayoutGrid as IconType },
];

// Shares active-route matching between the header, the tab bar and the sidebar.
export function isActivePath(path: string, pathname: string): boolean {
  return path === "/" ? pathname === "/" : pathname.startsWith(path);
}

export interface CreateAction {
  labelKey: string;
  path: string;
  icon: IconType;
}

// What can be created: the FAB offers them per page, the desktop "+ New" menu all at once.
export const ADD_BIKE: CreateAction = { labelKey: "fab.addBike", path: "/bikes/new", icon: BikeIconFill! };
export const ADD_SERVICE: CreateAction = { labelKey: "fab.addService", path: "/service/new", icon: BikecheckIcon };
