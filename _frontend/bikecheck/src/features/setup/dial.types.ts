// What one adjuster ring of a dial is handed: where it stands and how it reports a turn.
// Clicks are counted from fully closed on every adjuster (ADR 0029).
import type { CSSProperties } from "react";

// Which way the drawing turns as clicks are added; "ccw" mirrors the dial.
export type Direction = "cw" | "ccw";

export interface RingValue {
  // Clicks from fully closed, kept between zero and `max`.
  value: number;
  // A drawing hint for the range, not a cap (ADR 0029). Nothing records a real fork's range.
  max: number;
  onChange: (value: number) => void;
  // Clicks per full turn; each dial has its own default per ring.
  clicksPerTurn?: number;
  // Translated by the screen; the dial carries no text of its own.
  ariaLabel: string;
  // Spoken value, e.g. "7 clicks"; the bare number is read when omitted.
  ariaValueText?: string;
}

export type CompressionRing = "hsc" | "lsc";
export type ReboundRing = "hsr" | "lsr";

// What every compression dial takes, so the screen can swap Fox, RockShox and generic freely.
export interface CompressionDialProps {
  hsc: RingValue;
  lsc: RingValue;
  // Names the whole knob for assistive tech; translated by the screen.
  ariaLabel: string;
  direction?: Direction;
  haptics?: boolean;
  // Which ring was last touched, for a screen that highlights its card.
  onActive?: (ring: CompressionRing) => void;
  // An Archived Bike reads its dials without being able to turn them.
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

// What a single-knob rebound dial takes - only the LSR ring - so the screen can swap the fork
// and shock versions freely.
export interface SimpleReboundDialProps {
  lsr: RingValue;
  // Names the whole knob for assistive tech; translated by the screen.
  ariaLabel: string;
  haptics?: boolean;
  // Always "lsr" here; kept so the screen can swap this dial for a two-ring one.
  onActive?: (ring: ReboundRing) => void;
  // An Archived Bike reads its dials without being able to turn them.
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

// What a single-knob compression dial takes - only the LSC ring.
export interface SimpleCompressionDialProps {
  lsc: RingValue;
  // Names the whole knob for assistive tech; translated by the screen.
  ariaLabel: string;
  direction?: Direction;
  haptics?: boolean;
  // Always "lsc" here; kept so the screen can swap this dial for a two-ring one.
  onActive?: (ring: CompressionRing) => void;
  // An Archived Bike reads its dials without being able to turn them.
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
}

// Which adjuster pair a switch stands for: rebound or compression.
export type DialKind = "rebound" | "compression";
