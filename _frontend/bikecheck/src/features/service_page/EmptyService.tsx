// Service empty state.
import type { ReactElement } from "react";
import { Button, Center } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import bikeIllustration from "@/assets/images/empty_service_bike.png";

// Show the empty Service tab.
export function EmptyService(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <EmptyStateLayout illustration={bikeIllustration} title={t("service.emptyTitle")} body={t("service.emptyBody")}>
      {/* The first run should say what to do next, not only that there is nothing here. */}
      <Center>
        <Button
          color="primary.6"
          radius="xl"
          leftSection={<Plus size={18} />}
          onClick={() => {
            navigate("/service/new");
          }}
        >
          {t("fab.addService")}
        </Button>
      </Center>
    </EmptyStateLayout>
  );
}
