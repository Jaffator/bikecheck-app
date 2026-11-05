import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Welcome } from "@/features/onboarding/ui/Welcome";

// Played again on its own route: it writes nothing and closes to where it was opened from.
export function WelcomeReplay(): ReactElement {
  const navigate = useNavigate();
  const { key } = useLocation();

  const close = (): void => {
    // A route opened directly has no history to return to.
    if (key === "default") {
      navigate("/", { replace: true });
      return;
    }
    navigate(-1);
  };

  return <Welcome onSkip={close} onAddBike={() => navigate("/bikes/new", { replace: true })} />;
}
