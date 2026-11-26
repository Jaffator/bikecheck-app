import type { ReactElement, ReactNode, RefObject } from "react";
import { Text } from "@mantine/core";
import { ProTitle } from "./ProTitle";

interface ProStepHeadingProps {
  headingRef: RefObject<HTMLHeadingElement | null>;
  title: string;
  // The muted line under it.
  children: ReactNode;
}

export function ProStepHeading({ headingRef, title, children }: ProStepHeadingProps): ReactElement {
  return (
    <>
      <ProTitle
        headingRef={headingRef}
        fz={{ base: 24, md: 28 }}
        lh={1.2}
        fw={600}
        lts={{ base: "var(--tracking-title)", md: "var(--tracking-display)" }}
      >
        {title}
      </ProTitle>
      <Text className="tabular-nums" mt={{ base: 6, md: 10 }} fz={15} lh={1.45} c="var(--color-text-dim)" style={{ textWrap: "pretty" }}>
        {children}
      </Text>
    </>
  );
}
