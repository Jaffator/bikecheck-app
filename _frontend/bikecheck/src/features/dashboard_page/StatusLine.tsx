// Desktop Home's top line: Strava and profile visibility as quiet links, and the add-service button.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Box, Button, Group, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { VISIBILITY_COLOR, VISIBILITY_ICON, VISIBILITY_LABEL_KEY } from "@/features/profile/profileVisibility";
import { useMyProfile } from "@/features/profile/profile.queries";
import { ShareDrawer } from "@/features/profile/ui/ShareDrawer";
import { QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import { useConnectStrava } from "@/features/strava/strava.queries";
import { useCurrentUser } from "@/features/users/users.queries";

export function StatusLine(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: profile } = useMyProfile();
  const connect = useConnectStrava();
  const [sharing, setSharing] = useState(false);

  const connected = Boolean(user?.strava_athlete_id);
  const VisibilityIcon = profile ? VISIBILITY_ICON[profile.visibility] : null;

  return (
    <>
      <Group justify="space-between" wrap="nowrap" gap="md">
        <Group gap={4} wrap="wrap" style={{ minWidth: 0 }}>
          {connected ? (
            <StatusItem>
              <Dot color={QUIET_COLOR} />
              {t("strava.statusTitle")} · {t("strava.statusConnectedShort")}
            </StatusItem>
          ) : (
            <StatusItem onClick={() => connect.mutate()}>
              <Dot color="var(--mantine-color-strava-6)" />
              {t("strava.connect")} ›
            </StatusItem>
          )}
          {profile && VisibilityIcon && (
            <StatusItem onClick={() => setSharing(true)}>
              <VisibilityIcon size={14} color={VISIBILITY_COLOR[profile.visibility]} />
              {t("sharing.cardTitle")} · {t(VISIBILITY_LABEL_KEY[profile.visibility])} ›
            </StatusItem>
          )}
        </Group>
        <Button
          color="primary.6"
          c="textDark.6"
          radius="md"
          leftSection={<Plus size={16} />}
          onClick={() => navigate("/service/new")}
          style={{ flexShrink: 0 }}
        >
          {t("fab.addService")}
        </Button>
      </Group>

      <ShareDrawer opened={sharing} onClose={() => setSharing(false)} />
    </>
  );
}

function StatusItem({ onClick, children }: { onClick?: () => void; children: ReactNode }): ReactElement {
  const body = (
    <Group gap={8} wrap="nowrap">
      {children}
    </Group>
  );
  const style: CSSProperties = {
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    color: "var(--mantine-color-text-7)",
  };

  if (onClick === undefined) return <Box style={style}>{body}</Box>;
  return (
    <UnstyledButton onClick={onClick} className="hover-veil" style={style}>
      {body}
    </UnstyledButton>
  );
}

function Dot({ color }: { color: string }): ReactElement {
  return <Box w={7} h={7} style={{ borderRadius: 9999, backgroundColor: color, flexShrink: 0 }} />;
}
