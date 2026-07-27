// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Text } from "@mantine/core";
// import { useBikes } from "./bikes.queries";

export function Profile(): ReactElement {
  // const { data: bikes, isLoading, error } = useBikes();

  // if (isLoading) {
  //   return <Loader />;
  // }

  // if (error) {
  //   return <Text c="red">Failed to load bikes.</Text>;
  // }

  return (
    <>
      {[...Array(10)].map((_, i) => (
        <Card key={i} bg="cards.6" className="m-3 border h-100">
          <Text c="text.6">
            PROFILE PAGE: What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            Lorem Ipsum has
          </Text>
        </Card>
      ))}
    </>
  );
}
