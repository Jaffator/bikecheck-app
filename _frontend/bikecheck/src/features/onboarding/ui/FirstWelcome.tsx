import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useMarkWelcomeSeen } from "../onboarding.queries";
import { Welcome } from "./Welcome";

// The first entry to the app: either way out ends the Welcome for good, on every device.
export function FirstWelcome(): ReactElement {
  const navigate = useNavigate();
  const { mutate: markSeen } = useMarkWelcomeSeen();

  const leaveTo = (route: string): void => {
    markSeen();
    navigate(route);
  };

  return <Welcome onSkip={() => leaveTo("/")} onAddBike={() => leaveTo("/bikes/new")} />;
}
