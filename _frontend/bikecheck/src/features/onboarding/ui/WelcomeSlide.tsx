import type { ReactElement } from "react";
import { Box, Button, Group, Modal, Stack, Text, UnstyledButton } from "@mantine/core";
import { useTranslation } from "react-i18next";
import logoName from "@/assets/logo_name.svg";
import { useIsDesktop } from "@/layout/breakpoints";
import { WELCOME_SLIDES } from "../welcomeSlides";
import { WelcomeGarageGraphic } from "./WelcomeGarageGraphic";
import { WelcomeRidesGraphic } from "./WelcomeRidesGraphic";
import { WelcomeServiceGraphic } from "./WelcomeServiceGraphic";
import { WelcomeSharingGraphic } from "./WelcomeSharingGraphic";
import { WelcomeStage } from "./WelcomeStage";

const GRAPHICS = {
  rides: WelcomeRidesGraphic,
  service: WelcomeServiceGraphic,
  garage: WelcomeGarageGraphic,
  sharing: WelcomeSharingGraphic,
};

const LAST_INDEX = WELCOME_SLIDES.length - 1;
const DESKTOP_HEIGHT = 600;
const DESKTOP_PANEL_WIDTH = 380;
const PHONE_PANEL_HEIGHT = 252;
// The panel lies over the graphic by this much, so its rounded corners sit on the picture.
const PANEL_OVERLAP = 20;
const SAFE_TOP = "var(--safe-area-inset-top, env(safe-area-inset-top, 0px))";
const SAFE_BOTTOM = "var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))";
const PHONE_PANEL_SHADOW =
  "inset 0 1px 0 0 rgba(255,255,255,0.04), 0 -1px 2px 0 rgba(0,0,0,0.4), 0 -14px 32px -6px rgba(0,0,0,0.45)";
const DESKTOP_PANEL_SHADOW =
  "inset 1px 0 0 0 rgba(255,255,255,0.04), -1px 0 2px 0 rgba(0,0,0,0.4), -14px 0 32px -6px rgba(0,0,0,0.45)";

interface WelcomeSlideProps {
  index: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

function SkipButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <UnstyledButton mih={44} fz={14} fw={500} c="var(--color-muted)" onClick={onClick}>
      {t("onboarding.welcome.skip")}
    </UnstyledButton>
  );
}

function BackButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <UnstyledButton h={44} px={12} fz={16} fw={500} c="var(--color-muted)" onClick={onClick}>
      {t("onboarding.welcome.back")}
    </UnstyledButton>
  );
}

function StepDots({ index }: { index: number }): ReactElement {
  const { t } = useTranslation();
  return (
    <Group
      gap={8}
      wrap="nowrap"
      role="img"
      aria-label={t("onboarding.welcome.step", { current: index + 1, total: WELCOME_SLIDES.length })}
    >
      {WELCOME_SLIDES.map((slide, dot) => (
        <Box
          key={slide}
          w={8}
          h={8}
          style={{
            borderRadius: 9999,
            backgroundColor: dot === index ? "var(--mantine-color-primary-6)" : "var(--color-border-strong)",
          }}
        />
      ))}
    </Group>
  );
}

function NextButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <Button h={44} px={22} fz={16} fw={600} radius="md" c="textDark.6" onClick={onClick}>
      {t("onboarding.welcome.next")}
    </Button>
  );
}

function AddBikeButton({ onClick }: { onClick: () => void }): ReactElement {
  const { t } = useTranslation();
  return (
    <Button fullWidth h={50} fz={18} fw={600} radius="md" c="textDark.6" onClick={onClick}>
      {t("onboarding.welcome.addFirstBike")}
    </Button>
  );
}

function SlideText({ index, desktop }: { index: number; desktop: boolean }): ReactElement {
  const { t } = useTranslation();
  const slide = WELCOME_SLIDES[index];
  return (
    <>
      <Modal.Title
        className="welcome-title"
        mt={desktop ? 108 : 0}
        fz={desktop ? 28 : 26}
        lh={desktop ? "34px" : "32px"}
        fw={700}
        lts="var(--tracking-display)"
        c="text.6"
        style={{ textWrap: "balance" }}
      >
        {t(`onboarding.welcome.${slide}.title`)}
      </Modal.Title>
      <Text
        className="welcome-body"
        mt={desktop ? 12 : 10}
        fz={16}
        lh="24px"
        c="var(--color-text-dim)"
        style={{ textWrap: "pretty" }}
      >
        {t(`onboarding.welcome.${slide}.body`)}
      </Text>
    </>
  );
}

function PhoneSlide({ index, onNext, onSkip }: WelcomeSlideProps): ReactElement {
  const Graphic = GRAPHICS[WELCOME_SLIDES[index]];
  return (
    <Stack gap={0} h="100dvh" style={{ paddingTop: SAFE_TOP }}>
      <Group justify="space-between" wrap="nowrap" px={20} h={60} style={{ flexShrink: 0 }}>
        <img src={logoName} alt="BikeCheck" style={{ display: "block", height: 22 }} />
        <SkipButton onClick={onSkip} />
      </Group>

      <Box
        className="welcome-graphic"
        aria-hidden
        pos="relative"
        mb={-PANEL_OVERLAP}
        style={{ flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}
      >
        <WelcomeStage width={390} height={516}>
          <Graphic desktop={false} />
        </WelcomeStage>
      </Box>

      <Stack
        className="welcome-panel"
        gap={0}
        mih={PHONE_PANEL_HEIGHT}
        pos="relative"
        px={20}
        pt={28}
        bg="background.8"
        style={{
          zIndex: 1,
          flexShrink: 0,
          paddingBottom: `calc(32px + ${SAFE_BOTTOM})`,
          borderRadius: "20px 20px 0 0",
          boxShadow: PHONE_PANEL_SHADOW,
        }}
      >
        <SlideText index={index} desktop={false} />
        <Group mt="auto" h={50} justify="space-between" wrap="nowrap" style={{ flexShrink: 0 }}>
          {index === LAST_INDEX ? (
            <AddBikeButton onClick={onNext} />
          ) : (
            <>
              <StepDots index={index} />
              <NextButton onClick={onNext} />
            </>
          )}
        </Group>
      </Stack>
    </Stack>
  );
}

function DesktopSlide({ index, onBack, onNext, onSkip }: WelcomeSlideProps): ReactElement {
  const Graphic = GRAPHICS[WELCOME_SLIDES[index]];
  return (
    <Group gap={0} wrap="nowrap" align="stretch" h={DESKTOP_HEIGHT}>
      <Box
        className="welcome-graphic"
        aria-hidden
        pos="relative"
        mr={-PANEL_OVERLAP}
        style={{ flex: "1 1 auto", minWidth: 0, overflow: "hidden" }}
      >
        <WelcomeStage width={DESKTOP_HEIGHT} height={DESKTOP_HEIGHT}>
          <Graphic desktop />
        </WelcomeStage>
      </Box>

      <Stack
        className="welcome-panel"
        gap={0}
        w={DESKTOP_PANEL_WIDTH}
        pos="relative"
        px={32}
        pt={12}
        pb={32}
        bg="background.8"
        // Rounded on the right too: a transition snapshots it outside the dialog's clip.
        style={{ zIndex: 1, flexShrink: 0, borderRadius: 20, boxShadow: DESKTOP_PANEL_SHADOW }}
      >
        <Group justify="space-between" wrap="nowrap" h={60} style={{ flexShrink: 0 }}>
          <img src={logoName} alt="BikeCheck" style={{ display: "block", height: 22 }} />
          <SkipButton onClick={onSkip} />
        </Group>
        <SlideText index={index} desktop />
        <Group mt="auto" pt={24} justify="space-between" gap={8} wrap="nowrap">
          {index === LAST_INDEX ? (
            <>
              <BackButton onClick={onBack} />
              <Box style={{ flex: "1 1 auto", minWidth: 0 }}>
                <AddBikeButton onClick={onNext} />
              </Box>
            </>
          ) : (
            <>
              <StepDots index={index} />
              <Group gap={8} wrap="nowrap">
                {index > 0 && <BackButton onClick={onBack} />}
                <NextButton onClick={onNext} />
              </Group>
            </>
          )}
        </Group>
      </Stack>
    </Group>
  );
}

export function WelcomeSlide(props: WelcomeSlideProps): ReactElement {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopSlide {...props} /> : <PhoneSlide {...props} />;
}
