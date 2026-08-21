// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Box, Button, Stack, Text, Title } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { tapFeedback } from "@/utils/haptics";
import BikeAddedCheck from "@/assets/icons/bikecheck/bike_added_check.svg?react";

interface BikeAddedScreenProps {
  // What to call the bike that was just saved — its own name, or the model.
  bikeName: string;
  onContinue: () => void;
}

// Render the full-screen confirmation after saving a bike.
export function BikeAddedScreen({ bikeName, onContinue }: BikeAddedScreenProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack
      justify="space-between"
      gap={0}
      style={{
        minHeight: "100dvh",
        // Use the dedicated confirmation background.
        backgroundColor: "var(--mantine-color-background-9)",
        padding: "1rem",
        paddingTop: "calc(1rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
        paddingBottom: "calc(1rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))",
      }}
    >
      <Stack align="center" gap="md" style={{ flex: 1, justifyContent: "center" }}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            borderRadius: "9999px",
            backgroundColor: "rgba(55, 53, 43, 0.4)",
            border: "1px solid #4A4735",
            boxShadow: "0 0 20px 0 rgba(216, 198, 67, 0.2)",
          }}
        >
          <BikeAddedCheck width={33} height={33} style={{ color: "#F5E25C" }} />
        </Box>

        <Title
          order={1}
          ta="center"
          c="text.6"
          style={{ fontSize: "2rem", fontWeight: 600, letterSpacing: "-0.0188em", lineHeight: 1.1 }}
        >
          {t("addBike.addedTitle")}
        </Title>

        <Text ta="center" fw={600} size="xl" c="#E8E2D4" style={{ letterSpacing: "-0.016em" }}>
          {bikeName}
        </Text>
      </Stack>

      <Stack gap="lg" align="center">
        <Text ta="center" size="sm" c="#C7C6CA" opacity={0.6} maw={350} style={{ lineHeight: 1.4 }}>
          {t("addBike.addedBody")}
        </Text>

        <Button
          fullWidth
          radius="sm"
          rightSection={<ArrowRight size={12} />}
          onClick={() => {
            tapFeedback();
            onContinue();
          }}
          styles={{
            root: {
              height: "3.25rem",
              boxShadow: "0 0 10px 0 rgba(255, 255, 0, 0.25)",
            },
            label: {
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            },
          }}
        >
          {t("addBike.addedContinue")}
        </Button>
      </Stack>
    </Stack>
  );
}
