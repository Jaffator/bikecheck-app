// One step beside the card, under it on a phone: what it says on top, its buttons at the bottom.
import type { ReactElement, ReactNode } from "react";

interface ProStepFrameProps {
  children: ReactNode;
  actions: ReactNode;
}

export function ProStepFrame({ children, actions }: ProStepFrameProps): ReactElement {
  return (
    <div className="pro-sheet__step">
      <div>{children}</div>
      <div>{actions}</div>
    </div>
  );
}
