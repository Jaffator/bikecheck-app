import type { ReactElement } from "react";
import { Box } from "@mantine/core";
import logoOnly from "@/assets/logo_only.svg";
import { PLATE_PATH, WRENCH_PATH } from "./welcomeArt";

const MARK_SIZE = 112;
const RING_SIZE = 240;
const PRIMARY = "var(--mantine-color-primary-6)";

function MarkShape({ path, className }: { path: string; className: string }): ReactElement {
  return (
    <svg
      className={className}
      width={MARK_SIZE}
      height={MARK_SIZE}
      viewBox="0 0 318 318"
      fill="none"
      style={{ position: "absolute", inset: 0, overflow: "visible" }}
    >
      <path fillRule="evenodd" clipRule="evenodd" fill={PRIMARY} d={path} />
    </svg>
  );
}

// The ring is the wear gauge of the app, so it flashes as the two parts lock together.
export function WelcomeMark(): ReactElement {
  return (
    <Box className="welcome-mark" aria-hidden pos="relative" w={MARK_SIZE} h={MARK_SIZE}>
      <svg
        className="welcome-mark__ring"
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox="0 0 240 240"
        fill="none"
        style={{ position: "absolute", left: -64, top: -64, pointerEvents: "none" }}
      >
        <circle cx="120" cy="120" r="112" stroke={PRIMARY} strokeWidth="8" pathLength="360" strokeDasharray="1 2" />
      </svg>
      <Box className="welcome-mark__pulse" pos="relative" w={MARK_SIZE} h={MARK_SIZE}>
        <MarkShape path={WRENCH_PATH} className="welcome-mark__wrench" />
        <MarkShape path={PLATE_PATH} className="welcome-mark__plate" />
        <img
          src={logoOnly}
          alt=""
          className="welcome-mark__logo"
          width={MARK_SIZE}
          height={MARK_SIZE}
          style={{ position: "absolute", inset: 0, display: "block" }}
        />
      </Box>
    </Box>
  );
}
