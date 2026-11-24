import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBikeLimitStore } from "@/store/store";
import { askForRoom, knownToHaveRoom } from "../bikeLimit";

// The gate on the wizard's own address. Decided once on entry: saving the bike reaches the
// limit, and the screens after the save must stand.
export function AddBikeGate({ children }: { children: ReactNode }): ReactElement | null {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const showLimit = useBikeLimitStore((state) => state.show);
  const [open, setOpen] = useState(() => knownToHaveRoom(queryClient));

  useEffect(() => {
    if (open) return;
    let left = false;

    async function ask(): Promise<void> {
      const hasRoom = await askForRoom(queryClient);
      if (left) return;
      if (hasRoom) {
        setOpen(true);
        return;
      }
      showLimit();
      navigate("/", { replace: true });
    }

    void ask();
    return () => {
      left = true;
    };
  }, [open, queryClient, navigate, showLimit]);

  return open ? <>{children}</> : null;
}
