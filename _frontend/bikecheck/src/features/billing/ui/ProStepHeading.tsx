import type { ReactElement, ReactNode, RefObject } from "react";
import { Text, Title } from "@mantine/core";

interface ProStepHeadingProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  // The muted line under it.
  children: ReactNode;
}

export function ProStepHeading({ headingRef, title, children }: ProStepHeadingProps): ReactElement {
  return (
    <>
      <Title
        ref={headingRef}
        tabIndex={-1}
        className="pro-heading"
        order={2}
        fz={{ base: 24, md: 28 }}
        lh={1.2}
        fw={600}
        lts={{ base: "var(--tracking-title)", md: "var(--tracking-display)" }}
        c="text.6"
        style={{ textWrap: "balance" }}
      >
        {title}
      </Title>
      <Text mt={{ base: 6, md: 10 }} fz={15} lh={1.45} c="var(--color-text-dim)" style={{ textWrap: "pretty" }}>
        {children}
      </Text>
    </>
  );
}
