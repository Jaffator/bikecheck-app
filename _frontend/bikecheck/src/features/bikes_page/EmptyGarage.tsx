// A component only talks to hooks — no fetch, no URL, no manual loading state.
import type { ReactElement } from "react";
import { Button } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { EmptyStateLayout } from "@/components/EmptyStateLayout";
import { StatusBadge } from "@/components/StatusBadge";
import bikeIllustration from "@/assets/images/empty_garage_bike.png";

// What a user with no bikes yet sees on the Garage tab.
export function EmptyGarage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <EmptyStateLayout
      illustration={bikeIllustration}
      title={t("bikes.emptyTitle")}
      body={t("bikes.emptyBody")}
      badge={<StatusBadge label={t("bikes.noBikesFound")} />}
    >
      {/* TODO: /bikes/new does not exist yet — the add-bike flow is its own feature. */}
      {/* Same button as the one on Home, down to the label. */}
      {/* mt on top of the Stack gap gives the 32px the design puts here. */}
      <Button
        mt={16}
        h={56}
        radius={12}
        fz={16}
        fw={600}
        color="primary.6"
        c="textDark.6"
        leftSection={<Plus size={14} />}
        style={{ boxShadow: "0 0 10px 0 rgba(255, 255, 0, 0.25)" }}
        onClick={() => navigate("/bikes/new")}
      >
        {t("dashboard.addBike")}
      </Button>
    </EmptyStateLayout>
  );
}
