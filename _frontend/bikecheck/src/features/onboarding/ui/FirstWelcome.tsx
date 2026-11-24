import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { useAddBikeGate } from "@/features/billing/useAddBikeGate";
import { useWelcomeStore } from "@/store/store";
import { useMarkWelcomeSeen } from "../onboarding.queries";
import { Welcome } from "./Welcome";

// The first entry to the app: either way out ends the Welcome for good, on every device.
export function FirstWelcome({ userId }: { userId: number }): ReactElement {
  const navigate = useNavigate();
  const { mutate: markSeen } = useMarkWelcomeSeen();
  const setLeftBy = useWelcomeStore((state) => state.setLeftBy);

  const enterAddBike = useAddBikeGate();

  const leave = (): void => {
    markSeen();
    setLeftBy(userId);
  };

  const skip = (): void => {
    leave();
    navigate("/");
  };

  const addBike = (): void => {
    leave();
    void enterAddBike();
  };

  return <Welcome onSkip={skip} onAddBike={addBike} />;
}
