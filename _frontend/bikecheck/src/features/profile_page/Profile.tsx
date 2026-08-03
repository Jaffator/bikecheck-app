// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Button, Card } from "@mantine/core";
import { useLogout } from "../users/users.queries";

export function Profile(): ReactElement {
  const logout = useLogout();

  return (
    <Card bg="cards.6" className="m-3 border">
      <Button variant="filled" loading={logout.isPending} onClick={() => logout.mutate()}>
        Log out
      </Button>
    </Card>
  );
}
