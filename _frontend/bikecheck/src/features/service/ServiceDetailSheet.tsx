// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Button, Divider, Drawer, Group, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";
import { FileText, Image as ImageIcon, NotebookText, Paperclip, Share2, Trash2, X } from "lucide-react";
import dayjs from "dayjs";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useDeleteService, useServiceDetail } from "./service.queries";
import { catalogueLabel, componentLabel } from "./serviceLabels";
import { componentTypeIcon } from "./componentIcon";
import { attachmentSubtitle } from "./attachmentLabels";
import type { ServiceActionDone, ServiceAttachment, ServiceHistoryItem } from "./service.types";
import Bikecheck from "@/assets/icons/bikecheck/bikecheck.svg?react";

// The sheet stands over the list rather than covering it, so the list is still there to
// come back to. The strip left above it is what says so.
const SHEET_HEIGHT = "85vh";

// Mantine gives the Affix behind the FAB and this drawer the same z-index, which leaves
// the order in the DOM to decide - and the FAB's portal is rebuilt at the end of the body
// every time a sub-page hands the tab back. Saying it outright keeps the sheet on top.
const SHEET_Z_INDEX = 300;

interface ServiceDetailSheetProps {
  // Null closes the sheet.
  serviceId: number | null;
  // The card the user tapped. Its heading is already on screen, so the sheet opens with
  // it filled in and only the body waits for the detail. Null when the sheet was opened
  // from a link rather than from a row.
  seed: ServiceHistoryItem | null;
  onClose: () => void;
}

// One recorded Service: the whole occasion, over the list it was opened from.
export function ServiceDetailSheet({ serviceId, seed, onClose }: ServiceDetailSheetProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  // The sheet is still on screen while it slides out. Held on to, what it was last showing
  // stays drawn all the way down instead of emptying into skeletons on the way.
  const [lastOpened, setLastOpened] = useState<{ id: number; seed: ServiceHistoryItem | null } | null>(null);
  const remove = useDeleteService();

  if (serviceId !== null && (lastOpened === null || lastOpened.id !== serviceId || lastOpened.seed !== seed)) {
    setLastOpened({ id: serviceId, seed });
  }

  const shownId = serviceId ?? lastOpened?.id ?? null;
  const shownSeed = serviceId !== null ? seed : (lastOpened?.seed ?? null);
  const { data: service, isLoading, isError } = useServiceDetail(shownId);

  const currency = user?.currency ?? null;
  // Whichever is further along: the detail once it lands, the tapped card until then.
  // Null while neither has arrived, which is the only state the heading waits in — a
  // service whose bike is gone is known, it just has no name to give.
  const known = service ?? shownSeed;
  const bikeName = known === null || known === undefined ? null : (known.bike_name ?? t("service.unknownBike"));
  const serviceDate = known?.service_date ?? null;
  const actionCount = service?.actions_done.length ?? shownSeed?.action_count ?? null;
  const totalCost = service?.total_cost ?? shownSeed?.total_cost ?? null;

  function close(): void {
    setConfirmingDelete(false);
    onClose();
  }

  return (
    <Drawer
      opened={serviceId !== null}
      onClose={close}
      position="bottom"
      radius="lg"
      zIndex={SHEET_Z_INDEX}
      withCloseButton={false}
      transitionProps={{
        duration: 400,
        exitDuration: 400,
        transition: "slide-up",
        timingFunction: "cubic-bezier(0.2, 0, 0, 1)",
        onExited: () => setLastOpened(null),
      }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: {
          height: SHEET_HEIGHT,
          backgroundColor: "var(--mantine-color-cards-6)",
          display: "flex",
          flexDirection: "column",
        },
        // The body carries the scroll and the pinned bar, so it takes the padding away
        // from Mantine and hands it back per section.
        body: { flex: 1, minHeight: 0, padding: 0, display: "flex", flexDirection: "column" },
      }}
    >
      {/* Says "floating layer" and nothing more: the sheet does not answer to a drag. */}
      <Box
        mx="auto"
        mt="xs"
        w={36}
        h={4}
        style={{ borderRadius: 9999, backgroundColor: "var(--color-border-subtle)", flexShrink: 0 }}
      />

      <Box px="md" pt="md" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <Stack gap="lg" pb="md">
          {/* Outside the failure branch: a sheet that could not load is still a sheet the
              user has to be able to shut. */}
          <Header
            bikeName={bikeName}
            serviceDate={serviceDate}
            actionCount={actionCount}
            kmAtTime={service?.bike_km_at_time ?? null}
            minutesAtTime={service?.bike_minutes_at_time ?? null}
            onClose={close}
          />

          {isError ? (
            <Text c="red.5">{t("service.detailFailed")}</Text>
          ) : (
            <>
              <TotalRow cost={totalCost} currency={currency} language={i18n.language} />

              {isLoading ? (
                <Stack gap="md">
                  <Skeleton h={56} radius="sm" />
                  <Skeleton h={56} radius="sm" />
                </Stack>
              ) : (
                <>
                  <Stack gap="lg">
                    {service?.actions_done.map((action) => (
                      <ActionRow key={action.action_done_id} action={action} currency={currency} language={i18n.language} />
                    ))}
                  </Stack>

                  {service?.actions_done.length === 0 && (
                    <Text fz={14} c="var(--color-text-dim)">
                      {t("service.noActions")}
                    </Text>
                  )}

                  {/* What the user said about the occasion comes before what they filed
                      under it. */}
                  {service?.note && (
                    <Stack gap="xs">
                      <SectionHeading icon={<NotebookText size={14} />}>{t("service.note")}</SectionHeading>
                      <Divider color="var(--mantine-color-inputs-5)" />
                      <Text fz={14} c="text.8" style={{ whiteSpace: "pre-wrap" }}>
                        {service.note}
                      </Text>
                    </Stack>
                  )}

                  {(service?.attachments?.length ?? 0) > 0 && (
                    <Stack gap="xs">
                      <SectionHeading icon={<Paperclip size={14} />}>{t("service.attachments")}</SectionHeading>
                      <Divider color="var(--mantine-color-inputs-5)" />
                      {service?.attachments?.map((attachment) => (
                        <AttachmentCard key={attachment.id} attachment={attachment} language={i18n.language} />
                      ))}
                    </Stack>
                  )}
                </>
              )}
            </>
          )}

          {remove.isError && (
            <Text size="xs" c="red.5">
              {t("service.deleteFailed")}
            </Text>
          )}
        </Stack>
      </Box>

      {/* The two things that can be done with a recorded service stay reachable however
          far down the list of actions the user has read. */}
      <Group
        gap="sm"
        grow
        px="md"
        pt="sm"
        pb="calc(0.75rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))"
        wrap="nowrap"
        style={{ flexShrink: 0, borderTop: "1px solid var(--color-border-subtle)" }}
      >
        <Button
          variant="outline"
          color="red.5"
          radius="md"
          leftSection={<Trash2 size={16} />}
          loading={remove.isPending}
          onClick={() => {
            setConfirmingDelete(true);
          }}
          styles={{
            root: {
              backgroundColor: "transparent",
              borderColor: "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
            },
          }}
        >
          {t("service.delete")}
        </Button>
        {/* What it shares is settled separately; the button holds its place until then. */}
        <Button variant="outline" color="primary.5" radius="md" leftSection={<Share2 size={16} />}>
          {t("service.share")}
        </Button>
      </Group>

      <ConfirmModal
        opened={confirmingDelete}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          if (serviceId === null) return;
          remove.mutate(serviceId, {
            // The list underneath refreshes itself, so closing is all that is left to do.
            onSuccess: close,
          });
        }}
        title={t("service.deleteConfirmTitle")}
        body={t("service.deleteConfirmBody")}
        cancelLabel={t("service.deleteConfirmCancel")}
        confirmLabel={t("service.delete")}
        pending={remove.isPending}
      />
    </Drawer>
  );
}

// The occasion in one glance: which bike, when, how much of it there was.
function Header({
  bikeName,
  serviceDate,
  actionCount,
  kmAtTime,
  minutesAtTime,
  onClose,
}: {
  bikeName: string | null;
  serviceDate: string | null;
  actionCount: number | null;
  kmAtTime: number | null;
  minutesAtTime: number | null;
  onClose: () => void;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={8}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        {bikeName === null ? (
          <Skeleton h={26} w="55%" radius="sm" />
        ) : (
          <Text fw={700} fz={24} c="text.6" lh={1.2} style={{ minWidth: 0 }}>
            {bikeName}
          </Text>
        )}
        <ActionIcon variant="subtle" color="gray" radius="xl" size="lg" aria-label={t("action.close")} onClick={onClose}>
          <X size={20} color="var(--mantine-color-text-6)" />
        </ActionIcon>
      </Group>

      <Group gap={8} wrap="nowrap">
        <Bikecheck width={15} height={15} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
        <MetaText>
          {t("page.service")}
          {actionCount !== null && ` · ${t("service.actionCount", { count: actionCount })}`}
        </MetaText>
      </Group>

      <Group gap="md" wrap="nowrap">
        {/* Nothing knows the date yet while the heading is still a skeleton; saying "no
            date" there would be a different claim than "not loaded". */}
        {bikeName === null ? (
          <Skeleton h={14} w={110} radius="sm" />
        ) : (
          <MetaText>{serviceDate === null ? t("service.noDate") : dayjs(serviceDate).format("D. M. YYYY")}</MetaText>
        )}
        {/* The bike as it stood when the work happened, not as it reads today. Only the
            detail knows these, so they arrive a moment after the rest. */}
        {kmAtTime !== null && <MetaText>{t("bikes.kilometres", { count: kmAtTime })}</MetaText>}
        {minutesAtTime !== null && <MetaText>{t("bikes.hours", { count: Math.round(minutesAtTime / 60) })}</MetaText>}
      </Group>
    </Stack>
  );
}

// What the occasion cost in total, which is the number people come back for.
function TotalRow({
  cost,
  currency,
  language,
}: {
  cost: number | null;
  currency: string | null;
  language: string;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="baseline" wrap="nowrap">
        <SectionHeading>{t("service.total")}</SectionHeading>
        {cost === null ? (
          <Skeleton h={20} w={80} radius="sm" />
        ) : (
          <Text className="font-mono" fw={700} fz={18} c="primary.5">
            {formatCost(cost, currency, language)}
          </Text>
        )}
      </Group>
      <Divider color="var(--mantine-color-inputs-5)" />
    </Stack>
  );
}

// One item of work within the Service. A flat row, not a card: the sheet is already the
// card, and boxes inside boxes make a long service unreadable.
function ActionRow({
  action,
  currency,
  language,
}: {
  action: ServiceActionDone;
  currency: string | null;
  language: string;
}): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap={4}>
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Text fw={600} fz={17} c="text.6" style={{ minWidth: 0 }}>
          {catalogueLabel(action.action_i18n_key, action.action_name, t)}
        </Text>
        {/* Work with no price recorded reads as the zero it came to. */}
        <Text className="font-mono" fz={14} ta="right" c="text.7" style={{ flexShrink: 0 }}>
          {formatCost(action.partial_cost ?? 0, currency, language)}
        </Text>
      </Group>

      {action.mounted_components.length > 0 && (
        <Stack gap={2}>
          <RowLabel>{t("service.components")}</RowLabel>
          <Stack gap={0}>
            {action.mounted_components.map((component) => (
              // Icon set inline so a long part name wraps under it rather than beside it.
              <Text key={component.id} fz={13} c="text.8">
                <Box component="span" mr={6} style={{ display: "inline-block", verticalAlign: "-3px" }}>
                  {componentTypeIcon(component.component_type)}
                </Box>
                {componentLabel(component, t)}
              </Text>
            ))}
          </Stack>
        </Stack>
      )}

      {/* What was done, in the user's own words, with whatever tags they took already
          part of the same prose. Nothing stands in for it: the catalogue's tags
          describe the action, not the occasion — see ADR 0004. */}
      {action.note && (
        <Stack gap={2}>
          <RowLabel>{t("service.serviceDetails")}</RowLabel>
          <Text fz={13} c="var(--mantine-color-text-8)" style={{ whiteSpace: "pre-wrap" }}>
            {action.note}
          </Text>
        </Stack>
      )}
    </Stack>
  );
}

// Names one block inside an action — quieter than a section heading, which speaks for
// the whole sheet.
function RowLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text className="font-mono uppercase" fz={11} fw={600} c="text.7" lts="0.06em">
      {children}
    </Text>
  );
}

// A receipt is worth having when the part fails under warranty, so it opens.
function AttachmentCard({ attachment, language }: { attachment: ServiceAttachment; language: string }): ReactElement {
  const { t } = useTranslation();
  const isImage = attachment.content_type?.startsWith("image/") ?? false;
  const FileIcon = isImage ? ImageIcon : FileText;

  return (
    <UnstyledButton
      onClick={() => {
        if (attachment.url) void Browser.open({ url: attachment.url });
      }}
      p="sm"
      style={{
        backgroundColor: "var(--mantine-color-cards2-6)",
        borderRadius: "var(--mantine-radius-md)",
        border: "1px solid var(--color-border-subtle)",
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <FileIcon size={20} color="var(--mantine-color-primary-5)" style={{ flexShrink: 0 }} />
        <Stack gap={0} style={{ minWidth: 0 }}>
          <Text className="uppercase" fw={600} fz={13} c="text.7" lineClamp={1}>
            {attachment.name ?? t("service.attachment")}
          </Text>
          <Text fz={12} c="var(--mantine-color-text-8)" lineClamp={1}>
            {attachmentSubtitle(attachment, language, t)}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

// The small capitals that name a section of the sheet, with an optional mark in front of
// them for the sections that hold something rather than state a figure.
function SectionHeading({ children, icon }: { children: ReactNode; icon?: ReactNode }): ReactElement {
  return (
    <Group gap={6} align="center" wrap="nowrap" c="var(--mantine-color-text-8)">
      {icon}
      <Text className="font-mono uppercase" fz={12} fw={600} c="var(--mantine-color-text-8)" lts="0.08em">
        {children}
      </Text>
    </Group>
  );
}

// The metadata voice: mono, small, dim — the same one the history cards speak in.
function MetaText({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text className="font-mono uppercase" fz={12} c="var(--color-text-dim)" lts="0.06em">
      {children}
    </Text>
  );
}
