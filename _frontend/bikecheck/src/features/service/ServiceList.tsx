// UI component using feature hooks.
import { useRef, type ReactElement, type ReactNode } from "react";
import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ServiceHistoryCard } from "./ServiceHistoryCard";
import { ServiceDetailSheet } from "./ServiceDetailSheet";
import { formatMonthHeading, groupServicesByMonth } from "./serviceDates";
import type { ServiceHistoryItem } from "./service.types";

// Which service is open, if any. The detail is a layer over the list rather than a page
// of its own — see ADR 0010 — so it rides in the query string, where the path the list
// lives on is left untouched and the hardware back button closes it for free.
const OPEN_PARAM = "service";

interface ServiceListProps {
  services: ServiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  // Divides the list into Month Groups. The landing page shows too few services for a
  // month to mean anything, so only the full history asks for it.
  grouped?: boolean;
  // Rendered below the cards; the full history hangs its paging sentinel here.
  footer?: ReactNode;
}

// An id nobody could have typed by hand reads as nothing open, so junk in the URL never
// reaches the API.
function parseServiceId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// The service rows themselves, with the loading, failed and nothing-here states that
// stand in for them, and the detail that opens over them. Both the landing page and the
// full history render through this, so the two screens cannot drift apart.
export function ServiceList({ services, isLoading, isError, grouped = false, footer }: ServiceListProps): ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Opening pushes a history entry; closing should therefore pop it rather than stack a
  // second one, or the back button would afterwards land on the list twice over. A sheet
  // opened by a link has no entry of ours to pop.
  const openedHere = useRef(false);

  const openId = parseServiceId(searchParams.get(OPEN_PARAM));
  // The row the user tapped, so the sheet can open with its heading already filled in.
  const openSeed = services.find((service) => service.id === openId) ?? null;

  function open(service: ServiceHistoryItem): void {
    const params = new URLSearchParams(searchParams);
    params.set(OPEN_PARAM, String(service.id));
    openedHere.current = true;
    setSearchParams(params);
  }

  function close(): void {
    if (openedHere.current) {
      openedHere.current = false;
      navigate(-1);
      return;
    }
    const params = new URLSearchParams(searchParams);
    params.delete(OPEN_PARAM);
    setSearchParams(params, { replace: true });
  }

  return (
    <>
      <ServiceRows services={services} isLoading={isLoading} isError={isError} grouped={grouped} onOpen={open} />
      {footer}
      <ServiceDetailSheet serviceId={openId} seed={openSeed} onClose={close} />
    </>
  );
}

// The list itself, in whichever state it is in.
function ServiceRows({
  services,
  isLoading,
  isError,
  grouped,
  onOpen,
}: {
  services: ServiceHistoryItem[];
  isLoading: boolean;
  isError: boolean;
  grouped: boolean;
  onOpen: (service: ServiceHistoryItem) => void;
}): ReactElement {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Group justify="center" p="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text size="sm" c="red.5">
        {t("service.loadFailed")}
      </Text>
    );
  }

  if (services.length === 0) {
    return (
      <Text fz={14} c="var(--color-text-dim)">
        {t("service.emptyForBike")}
      </Text>
    );
  }

  if (grouped) {
    return (
      <>
        {groupServicesByMonth(services).map((group) => (
          <Stack key={group.key} gap="xs">
            {/* The heading holds at the top of the screen while its own month scrolls
                past, so the user is never looking at dates without knowing the month.
                It carries the page background: the cards pass under it, not through it.
                The offset is the app header's height - see AppLayout. */}
            <Box
              py={6}
              style={{
                position: "sticky",
                top: "calc(3.5rem + var(--safe-area-inset-top, env(safe-area-inset-top, 0px)))",
                zIndex: 1,
                backgroundColor: "var(--mantine-color-background-9)",
              }}
            >
              <Text className="font-mono uppercase" fz={12} fw={600} c="var(--color-text-dim)" lts="0.08em">
                {group.month === null ? t("service.noDateGroup") : formatMonthHeading(group.month)}
              </Text>
            </Box>

            {/* Every service is its own card; the month only gathers them under a
                heading. */}
            <Stack gap="sm">
              {group.services.map((service) => (
                <ServiceHistoryCard
                  key={service.id}
                  grouped
                  service={service}
                  onOpen={() => {
                    onOpen(service);
                  }}
                />
              ))}
            </Stack>
          </Stack>
        ))}
      </>
    );
  }

  return (
    <>
      {services.map((service) => (
        <ServiceHistoryCard
          key={service.id}
          service={service}
          onOpen={() => {
            onOpen(service);
          }}
        />
      ))}
    </>
  );
}
