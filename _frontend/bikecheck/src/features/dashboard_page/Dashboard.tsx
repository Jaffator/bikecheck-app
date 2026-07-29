// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Text, Image, Button } from "@mantine/core";
import dashboardImage from "../../assets/images/dashboard.png";
import { useBikes } from "../bikes/bikes.queries";
import { useLogout } from "../users/users.queries";

export function Dashboard(): ReactElement {
  const { refetch, error } = useBikes();
  const logout = useLogout();
  // if (isLoading) {
  //   return <Loader />;
  // }

  // if (error) {
  //   return <Text c="red">Failed to load bikes.</Text>;
  // }
  if (error) console.log("Error fetching bikes:", error);
  return (
    <>
      <Card bg="cards.6" className="m-3 border h-auto flex flex-col">
        <Image src={dashboardImage}></Image>
        <Button
          onClick={() => {
            console.log("Logging out...");
            logout.mutate();
          }}
        >
          Log out
        </Button>
        <Text c="text.6">
          DASHBOARD PAGE: What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry.
          Lorem Ipsum has
        </Text>
        <Button
          variant="filled"
          onClick={async () => {
            await refetch();
          }}
        >
          Button
        </Button>
      </Card>
    </>
  );
}
