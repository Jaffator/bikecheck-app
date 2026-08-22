// A component only talks to hooks — no fetch, no URL, no manual loading state.
import { useState, type ReactElement } from "react";
import { Button, Divider, Group, Modal, Paper, Skeleton, Stack, Text, UnstyledButton } from "@mantine/core";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Browser } from "@capacitor/browser";
import { Bike, Clock, Gauge, Paperclip, Trash2, Wrench } from "lucide-react";
import dayjs from "dayjs";
import { tapFeedback } from "@/utils/haptics";
import { formatCost } from "@/utils/money";
import { useCurrentUser } from "@/features/users/users.queries";
import { useDeleteService, useServiceDetail } from "@/features/service/service.queries";
import type { ServiceActionDone, ServiceAttachment } from "@/features/service/service.types";
import { catalogueLabel, componentLabel, tagLine } from "@/features/service/serviceLabels";

// One recorded Service: the whole occasion in one view.
export function ServiceDetail(): ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: user } = useCurrentUser();
  const { data: service, isLoading, isError } = useServiceDetail(Number(id));
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const remove = useDeleteService();

  if (isLoading) {
    return (
      <Stack gap="md" px="md" pt="md">
        <Skeleton h={28} w="60%" radius="sm" />
        <Skeleton h={18} w="40%" radius="sm" />
        <Skeleton h={120} radius="md" />
      </Stack>
    );
  }

  if (isError || !service) {
    return (
      <Text m="md" c="red.5">
        {t("service.detailFailed")}
      </Text>
    );
  }

  const currency = user?.currency ?? null;

  return (
    <Stack gap="md" px="md" pt="md" pb="calc(2rem + var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 10px)))">
      <Stack gap={4}>
        <Text fw={700} fz={22} c="text.6" lh={1.2}>
          {service.bike_name ?? t("service.unknownBike")}
        </Text>
        <Group gap={6} wrap="nowrap">
          <Bike size={14} color="var(--color-text-dim)" />
          <Text fz={14} c="var(--color-text-dim)">
            {service.service_date === null
              ? t("service.noDate")
              : dayjs(service.service_date).format("D. M. YYYY")}
            {" · "}
            {t("service.actionCount", { count: service.actions_done.length })}
          </Text>
        </Group>
      </Stack>

      {/* The bike as it stood when the work happened, not as it reads today. */}
      <Group gap="lg" wrap="nowrap">
        {service.bike_km_at_time !== null && (
          <Group gap={6} wrap="nowrap">
            <Gauge size={14} color="var(--color-text-dim)" />
            <Text fz={15} c="text.6">
              {t("bikes.kilometres", { count: service.bike_km_at_time })}
            </Text>
          </Group>
        )}
        {service.bike_minutes_at_time !== null && (
          <Group gap={6} wrap="nowrap">
            <Clock size={14} color="var(--color-text-dim)" />
            <Text fz={15} c="text.6">
              {t("bikes.hours", { count: Math.round(service.bike_minutes_at_time / 60) })}
            </Text>
          </Group>
        )}
      </Group>

      <Text fw={700} fz={18} c="primary.5">
        {formatCost(service.total_cost, currency, i18n.language)}
      </Text>

      <Divider color="var(--color-border-subtle)" />

      {service.actions_done.map((action) => (
        <ActionCard key={action.action_done_id} action={action} currency={currency} language={i18n.language} />
      ))}

      {service.actions_done.length === 0 && (
        <Text fz={14} c="var(--color-text-dim)">
          {t("service.noActions")}
        </Text>
      )}

      {service.note && (
        <Stack gap={4}>
          <Text fz={14} c="text.6">
            {t("service.note")}
          </Text>
          <Text fz={14} c="var(--color-text-dim)" style={{ whiteSpace: "pre-wrap" }}>
            {service.note}
          </Text>
        </Stack>
      )}

      {(service.attachments?.length ?? 0) > 0 && (
        <Stack gap="xs">
          <Text fz={14} c="text.6">
            {t("service.attachments")}
          </Text>
          {service.attachments?.map((attachment) => (
            <AttachmentRow key={attachment.id} attachment={attachment} />
          ))}
        </Stack>
      )}

      <Button
        variant="outline"
        color="red.5"
        radius="md"
        leftSection={<Trash2 size={16} />}
        loading={remove.isPending}
        onClick={() => {
          void tapFeedback();
          setConfirmingDelete(true);
        }}
        styles={{
          root: {
            alignSelf: "flex-start",
            backgroundColor: "transparent",
            borderColor: "color-mix(in srgb, var(--mantine-color-red-5) 45%, transparent)",
          },
        }}
      >
        {t("service.delete")}
      </Button>

      {remove.isError && (
        <Text size="xs" c="red.5">
          {t("service.deleteFailed")}
        </Text>
      )}

      <Modal
        opened={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title={t("service.deleteConfirmTitle")}
        centered
        radius="md"
        styles={{
          content: { backgroundColor: "var(--mantine-color-cards-6)" },
          header: { backgroundColor: "var(--mantine-color-cards-6)" },
          title: { fontWeight: 600, color: "var(--mantine-color-text-6)" },
        }}
      >
        <Stack gap="lg">
          <Text size="sm" c="var(--color-text-dim)" style={{ lineHeight: 1.45 }}>
            {t("service.deleteConfirmBody")}
          </Text>

          <Group gap="sm" grow>
            <Button variant="default" radius="md" onClick={() => setConfirmingDelete(false)} disabled={remove.isPending}>
              {t("service.deleteConfirmCancel")}
            </Button>
            <Button
              color="red.5"
              radius="md"
              loading={remove.isPending}
              onClick={() => {
                void tapFeedback();
                remove.mutate(service.id, {
                  // Replace the detail in history with the list it just left.
                  onSuccess: () => navigate("/service", { replace: true }),
                });
              }}
            >
              {t("service.delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

// One item of work within the Service.
function ActionCard({
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
    <Paper
      radius="lg"
      p="md"
      style={{
        // Colour, glow and inner edge all live in this one object: `bg` would emit the
        // `background` shorthand and wipe the gradient - see docs/ui/card-surface.md.
        backgroundColor: "var(--mantine-color-cards-6)",
        backgroundImage:
          "radial-gradient(90% 120% at 0% 0%, color-mix(in srgb, var(--mantine-color-primary-6) 7%, transparent) 0%, transparent 45%)",
        border: "1px solid var(--color-border-subtle)",
        boxShadow:
          "inset 0 1px 0 0 rgba(255, 255, 255, 0.04), 0 1px 2px 0 rgba(0, 0, 0, 0.35), 0 8px 16px -6px rgba(0, 0, 0, 0.5)",
      }}
    >
      <Stack gap="xs">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
            <Wrench size={16} color="var(--mantine-color-primary-5)" style={{ flexShrink: 0 }} />
            <Text fw={600} fz={15} c="text.6">
              {catalogueLabel(action.action_i18n_key, action.action_name, t)}
            </Text>
          </Group>
          {/* Work with no price recorded is explicitly free rather than blank. */}
          <Text className="font-mono" fz={13} c={action.partial_cost === null ? "var(--color-text-dim)" : "text.6"}>
            {action.partial_cost === null
              ? t("service.noCharge")
              : formatCost(action.partial_cost, currency, language)}
          </Text>
        </Group>

        {action.mounted_components.map((component) => (
          <Text key={component.id} fz={13} c="text.7">
            {componentLabel(component, t)}
          </Text>
        ))}

        {/* What the job included, from the catalogue — never recorded per occasion. */}
        {action.tags.length > 0 && (
          <Text fz={13} c="var(--color-text-dim)">
            {tagLine(action.tags, t)}
          </Text>
        )}

        {action.note && (
          <Text fz={13} c="var(--color-text-dim)" style={{ whiteSpace: "pre-wrap" }}>
            {action.note}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

// A receipt is worth having when the part fails under warranty, so it opens.
function AttachmentRow({ attachment }: { attachment: ServiceAttachment }): ReactElement {
  const { t } = useTranslation();

  return (
    <UnstyledButton
      onClick={() => {
        void tapFeedback();
        if (attachment.url) void Browser.open({ url: attachment.url });
      }}
    >
      <Group gap={6} wrap="nowrap">
        <Paperclip size={14} color="var(--mantine-color-primary-5)" style={{ flexShrink: 0 }} />
        <Text fz={13} c="primary.5" lineClamp={1}>
          {attachment.name ?? t("service.attachment")}
        </Text>
      </Group>
    </UnstyledButton>
  );
}
