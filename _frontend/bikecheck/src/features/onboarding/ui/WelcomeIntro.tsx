import type { CSSProperties, ReactElement } from "react";
import { Box, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useIsDesktop } from "@/layout/breakpoints";
import { WelcomeMark } from "./WelcomeMark";
import { WelcomeSkipButton } from "./WelcomeSkipButton";
import { SAFE_BOTTOM, SAFE_TOP, WELCOME_DESKTOP_HEIGHT } from "./welcomeLayout";

const START_WIDTH = 320;

interface WelcomeIntroProps {
  onStart: () => void;
  onSkip: () => void;
}

function rise(delay: number): CSSProperties {
  return { "--welcome-delay": `${String(delay)}ms` } as CSSProperties;
}

function StartButton({ onClick, fullWidth }: { onClick: () => void; fullWidth: boolean }): ReactElement {
  const { t } = useTranslation();
  return (
    <Button
      className="welcome-rise"
      style={rise(1140)}
      fullWidth={fullWidth}
      w={fullWidth ? undefined : START_WIDTH}
      maw="100%"
      mt={fullWidth ? 0 : 32}
      h={50}
      fz={18}
      fw={600}
      radius="md"
      c="textDark.6"
      onClick={onClick}
    >
      {t("onboarding.welcome.start")}
    </Button>
  );
}

export function WelcomeIntro({ onStart, onSkip }: WelcomeIntroProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();

  return (
    <Stack
      gap={0}
      h={isDesktop ? undefined : "100dvh"}
      mih={isDesktop ? WELCOME_DESKTOP_HEIGHT : undefined}
      px={isDesktop ? 32 : 20}
      bg={isDesktop ? "background.8" : "background.9"}
      style={{ paddingTop: isDesktop ? 12 : SAFE_TOP, paddingBottom: isDesktop ? 72 : `calc(32px + ${SAFE_BOTTOM})` }}
    >
      <Group justify="flex-end" h={60} style={{ flexShrink: 0 }}>
        <WelcomeSkipButton onClick={onSkip} />
      </Group>

      <Stack gap={0} align="center" justify="center" ta="center" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <WelcomeMark />
        <Modal.Title
          className="welcome-rise"
          mt={32}
          fz={32}
          lh="38px"
          fw={700}
          lts="var(--tracking-display)"
          c="text.6"
          style={{ ...rise(980), textWrap: "balance" }}
        >
          {t("onboarding.welcome.intro.title")}
        </Modal.Title>
        <Text
          className="welcome-rise"
          mt={10}
          fz={16}
          lh="24px"
          c="var(--color-text-dim)"
          style={{ ...rise(1060), textWrap: "pretty" }}
        >
          {t("onboarding.welcome.intro.body")}
        </Text>
        {isDesktop && <StartButton onClick={onStart} fullWidth={false} />}
      </Stack>

      {!isDesktop && (
        <Box style={{ flexShrink: 0 }}>
          <StartButton onClick={onStart} fullWidth />
        </Box>
      )}
    </Stack>
  );
}
