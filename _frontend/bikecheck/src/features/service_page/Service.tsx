// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Card, Text, Image } from "@mantine/core";
import serviceImage from "../../assets/images/service.png";
// import { useBikes } from "./bikes.queries";

export function Service(): ReactElement {
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
          <Image src={serviceImage}></Image>
          <Text c="text.6">
            SERVICE PAGE: What is Lorem Ipsum? Lorem Ipsum is simply dummy text of the printing and typesetting industry.
            Lorem Ipsum has
          </Text>
        </Card>
      ))}
    </>
  );
}
