// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { type ReactElement } from "react";
import { Group, Loader, Paper, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { SearchX, Wrench } from "lucide-react";
import { IoCloudOffline } from "react-icons/io5";
import type { ExternalBikeComponent } from "../bikes/bikes.types";

interface BikeComponentListProps {
  components: ExternalBikeComponent[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

// The scraper reports a translation key when it recognised the part, and the
// raw scraped name when it did not.
function componentLabel(component: ExternalBikeComponent, translate: (key: string) => string): string {
  const key = component.component_i18n_key;
  return key ? translate(key) : component.component_name;
}

// Loading, failure and "nothing found" all replace the list with the same
// centred panel — only the mark and the wording differ.
function StatusPanel({
  mark,
  title,
  body,
  titleColor,
}: {
  mark: ReactElement;
  title?: string;
  body: string;
  titleColor?: string;
}): ReactElement {
  return (
    <Paper bg="cards.6" p="xl" radius="md" py={40}>
      <Stack gap="md" align="center">
        {mark}
        {title && (
          <Text fw={700} size="lg" c={titleColor} ta="center">
            {title}
          </Text>
        )}
        <Text size="sm" c="text.7" ta="center">
          {body}
        </Text>
      </Stack>
    </Paper>
  );
}

export function BikeComponentList({ components, isLoading, isError }: BikeComponentListProps): ReactElement {
  const { t } = useTranslation();

  if (isLoading) {
    return <StatusPanel mark={<Loader color="primary.6" />} body={t("addBike.componentsLoading")} />;
  }

  // Scraping a detail page fails the same way the search does, and the user has
  // the same way out — carry on and add the parts by hand later.
  if (isError) {
    return (
      <StatusPanel
        mark={<IoCloudOffline size={35} color="var(--mantine-color-red-4)" />}
        title={t("addBike.componentsFailedTitle")}
        titleColor="red.4"
        body={t("addBike.componentsFailedBody")}
      />
    );
  }

  if (components === undefined || components.length === 0) {
    return (
      <StatusPanel
        mark={<SearchX size={35} color="var(--mantine-color-text-8)" />}
        title={t("addBike.componentsEmptyTitle")}
        titleColor="text.6"
        body={t("addBike.componentsEmptyBody")}
      />
    );
  }

  return (
    <Stack gap="md">
      <Text size="sm" c="text.7">
        {t("addBike.componentsBody")}
      </Text>

      <Text size="sm" fw={600} c="text.7">
        {t("addBike.componentsFound", { count: components.length })}
      </Text>

      {components.map((component, index) => {
        // The rest of the mounted-component record is bookkeeping the user has
        // not created yet, so only the scraped description is worth showing.
        const description = component.component.component_desc;

        return (
          <Paper
            // The scraper has no stable id per part, and the same type can
            // appear twice (front/rear), so position in the list identifies it.
            key={`${component.component_name}-${component.component.position ?? index}`}
            bg="cards.6"
            p="md"
            radius="md"
            style={{ border: "1px solid var(--mantine-color-other-borderSubtle)" }}
          >
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <Wrench size={18} color="var(--mantine-color-primary-6)" style={{ flexShrink: 0, marginTop: 2 }} />
              <Stack gap={2}>
                <Text fw={600} size="md" c="text.6">
                  {componentLabel(component, t)}
                </Text>
                {description && (
                  <Text size="sm" c="text.8">
                    {description}
                  </Text>
                )}
                {component.component.position && (
                  <Text size="xs" c="text.9" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                    {component.component.position}
                  </Text>
                )}
              </Stack>
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
}
