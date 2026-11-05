// Which reading a Home figure shows, remembered per figure on this device.
import { useState } from "react";
import type { FigureReading } from "./figureReadings";

// The figures that flip between the two readings.
export type ReadingFigure = "distance" | "climb";

const DEFAULT_READING: FigureReading = "comparison";

function storageKey(figure: ReadingFigure): string {
  return `home-reading-${figure}`;
}

function storedReading(figure: ReadingFigure): FigureReading {
  try {
    const value = localStorage.getItem(storageKey(figure));
    return value === "equivalent" || value === "comparison" ? value : DEFAULT_READING;
  } catch {
    return DEFAULT_READING;
  }
}

function storeReading(figure: ReadingFigure, reading: FigureReading): void {
  try {
    localStorage.setItem(storageKey(figure), reading);
  } catch {
    // Storage refused (private mode): the flip still holds until reload.
  }
}

export interface FigureReadingControls {
  reading: FigureReading;
  flip: () => void;
}

export function useFigureReading(figure: ReadingFigure): FigureReadingControls {
  const [reading, setReading] = useState<FigureReading>(() => storedReading(figure));

  const flip = (): void => {
    const next: FigureReading = reading === "comparison" ? "equivalent" : "comparison";
    storeReading(figure, next);
    setReading(next);
  };

  return { reading, flip };
}
