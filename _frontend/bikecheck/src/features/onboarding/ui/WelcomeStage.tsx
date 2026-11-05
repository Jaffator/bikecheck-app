import type { ReactElement, ReactNode } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";

interface WelcomeStageProps {
  width: number;
  height: number;
  children: ReactNode;
}

// A graphic is drawn at a fixed size; scaling it whole keeps a 360×640 phone free of scrolling.
export function WelcomeStage({ width, height, children }: WelcomeStageProps): ReactElement {
  const { ref, width: boxWidth, height: boxHeight } = useElementSize();
  const scale = Math.min(boxWidth / width, boxHeight / height);

  return (
    <Box ref={ref} pos="absolute" inset={0}>
      {scale > 0 && (
        <Box
          pos="absolute"
          left={(boxWidth - width * scale) / 2}
          top={(boxHeight - height * scale) / 2}
          w={width}
          h={height}
          style={{ transform: `scale(${String(scale)})`, transformOrigin: "0 0" }}
        >
          {children}
        </Box>
      )}
    </Box>
  );
}
