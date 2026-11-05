// PROTOTYPE for #337, never merged: one line drawing per slide, one yellow detail each, no figures.
import type { ComponentType, ReactElement, ReactNode } from "react";
import { Box } from "@mantine/core";
import { ArrowUpRight, Check, Plus, Wrench } from "lucide-react";

const LINE = "var(--color-text-dim)";
const ACCENT = "var(--mantine-color-primary-6)";
const STROKE = 2.5;
const VIEW_WIDTH = 240;
const VIEW_HEIGHT = 200;

// The dial's ticks sweep 270°, and the setting stands on the ninth.
const DIAL_ANGLES = Array.from({ length: 13 }, (_, index) => -135 + index * 22.5);
const DIAL_SETTING = DIAL_ANGLES[8];

function Graphic({ children }: { children: ReactNode }): ReactElement {
  return (
    <Box w="100%" maw={360} mx="auto">
      <svg
        viewBox={`0 0 ${String(VIEW_WIDTH)} ${String(VIEW_HEIGHT)}`}
        width="100%"
        fill="none"
        stroke={LINE}
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        style={{ display: "block" }}
      >
        {children}
      </svg>
    </Box>
  );
}

// A yellow badge whose ground masks the line drawing behind it.
function Badge({ x, y, children }: { x: number; y: number; children: ReactNode }): ReactElement {
  return (
    <g>
      <circle cx={x} cy={y} r={22} fill="var(--mantine-color-background-9)" stroke={ACCENT} />
      {children}
    </g>
  );
}

function BikeLines({ dashed = false }: { dashed?: boolean }): ReactElement {
  return (
    <g strokeDasharray={dashed ? "6 8" : undefined}>
      <circle cx={56} cy={132} r={38} />
      <circle cx={184} cy={132} r={38} />
      <path d="M56 132 L100 132 L88 80 Z" />
      <path d="M88 80 L150 76 L100 132" />
      <path d="M150 76 L184 132" />
      <path d="M88 80 L84 64 M70 62 H98" />
      <path d="M150 76 L146 60 M136 58 H158" />
    </g>
  );
}

function ToolGraphic(): ReactElement {
  return (
    <Graphic>
      <BikeLines />
      <Badge x={196} y={44}>
        <Check x={184} y={32} size={24} color={ACCENT} strokeWidth={STROKE} />
      </Badge>
    </Graphic>
  );
}

function ServiceGraphic(): ReactElement {
  return (
    <Graphic>
      <circle cx={120} cy={100} r={76} />
      <circle
        cx={120}
        cy={100}
        r={76}
        stroke={ACCENT}
        strokeWidth={6}
        pathLength={100}
        strokeDasharray="82 100"
        transform="rotate(-90 120 100)"
      />
      <Wrench x={90} y={70} size={60} color={LINE} strokeWidth={1.25} />
    </Graphic>
  );
}

function ShareGraphic(): ReactElement {
  return (
    <Graphic>
      <path d="M74 28 H136 L168 60 V172 H74 Z" />
      <path d="M136 28 V60 H168" />
      <path d="M94 92 H148 M94 114 H148 M94 136 H122" />
      <Badge x={168} y={146}>
        <ArrowUpRight x={156} y={134} size={24} color={ACCENT} strokeWidth={STROKE} />
      </Badge>
    </Graphic>
  );
}

function SetupGraphic(): ReactElement {
  return (
    <Graphic>
      {DIAL_ANGLES.map((angle) => (
        <path
          key={angle}
          d="M120 16 V28"
          stroke={angle === DIAL_SETTING ? ACCENT : LINE}
          transform={`rotate(${String(angle)} 120 100)`}
        />
      ))}
      <circle cx={120} cy={100} r={58} />
      <path d="M120 52 V76" stroke={ACCENT} strokeWidth={4} transform={`rotate(${String(DIAL_SETTING)} 120 100)`} />
    </Graphic>
  );
}

function FirstBikeGraphic(): ReactElement {
  return (
    <Graphic>
      <BikeLines dashed />
      <Badge x={120} y={108}>
        <Plus x={108} y={96} size={24} color={ACCENT} strokeWidth={STROKE} />
      </Badge>
    </Graphic>
  );
}

export const WELCOME_GRAPHICS: ComponentType[] = [ToolGraphic, ServiceGraphic, ShareGraphic, SetupGraphic, FirstBikeGraphic];
