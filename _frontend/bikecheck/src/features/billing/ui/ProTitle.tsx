import type { ReactElement, ReactNode, RefObject } from "react";
import { Title, type TitleProps } from "@mantine/core";

interface ProTitleProps extends Pick<TitleProps, "fz" | "lh" | "fw" | "lts" | "c"> {
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}

// The heading of a step, which takes focus when the step comes.
export function ProTitle({ headingRef, children, ...type }: ProTitleProps): ReactElement {
  return (
    <Title
      ref={headingRef}
      tabIndex={-1}
      className="pro-heading"
      order={2}
      c="text.6"
      style={{ textWrap: "balance" }}
      {...type}
    >
      {children}
    </Title>
  );
}
