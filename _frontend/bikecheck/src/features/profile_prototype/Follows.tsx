// PROTOTYPE #128 — throwaway. The Follows sub-page (/follows, pattern: /reports): title,
// a segment for the two tabs, and the tab body in whichever variant the switcher holds.
// ?tab=followers is the address the dashboard figures and the notifications point at.
import { useEffect, type ReactElement } from "react";
import { SegmentedControl, Stack, Text } from "@mantine/core";
import { useSearchParams } from "react-router-dom";
import { useHeaderStore } from "@/store/store";
import { useFollowsModel, type FollowsTab } from "./follows.model";
import { FollowsVariantCards } from "./FollowsVariantCards";
import { FollowsVariantList } from "./FollowsVariantList";
import { FollowsVariantPanels } from "./FollowsVariantPanels";
import { usePrototypeStore } from "./prototype.store";

function readTab(value: string | null): FollowsTab {
  return value === "followers" ? "followers" : "following";
}

export function Follows(): ReactElement {
  const [params, setParams] = useSearchParams();
  const tab = readTab(params.get("tab"));
  const variant = usePrototypeStore((state) => state.variant);
  const setTitleSlot = useHeaderStore((state) => state.setTitleSlot);
  const model = useFollowsModel();

  // No translation key yet: the title is written straight into the header's slot.
  useEffect(() => {
    setTitleSlot(
      <Text fw={700} size="lg" c="text.6">
        Sledování
      </Text>,
    );
    return () => setTitleSlot(null);
  }, [setTitleSlot]);

  function changeTab(value: string): void {
    const next = new URLSearchParams(params);
    if (value === "followers") next.set("tab", "followers");
    else next.delete("tab");
    setParams(next, { replace: true });
  }

  return (
    <Stack gap={0}>
      <Stack px="md" pt="sm">
        <SegmentedControl
          fullWidth
          value={tab}
          onChange={changeTab}
          data={[
            { value: "following", label: "Sledovaní" },
            { value: "followers", label: "Sledující" },
          ]}
        />
      </Stack>
      {variant === "1" && <FollowsVariantCards model={model} tab={tab} />}
      {variant === "2" && <FollowsVariantPanels model={model} tab={tab} />}
      {variant === "3" && <FollowsVariantList model={model} tab={tab} />}
    </Stack>
  );
}
