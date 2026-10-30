// One bike's Tracked Actions as slides, soonest first; keyed by the bike, so a new bike opens on its first.
import { useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { ActionIcon, Box, Group, Paper, Stack, Text, UnstyledButton } from "@mantine/core";
import { Carousel } from "@mantine/carousel";
import type { EmblaCarouselType } from "embla-carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { catalogueLabel } from "@/features/service/serviceLabels";
import { attentionColor, QUIET_BELOW, trackedActionKey } from "@/features/service_tracking/attentionLevel";
import { remainingLabel } from "@/features/service_tracking/intervalFigures";
import { useIsDesktop } from "@/layout/breakpoints";
import type { WearForecastItem } from "../stats.types";
import { forecastNote } from "../wearForecast";
import { ForecastChart } from "./ForecastChart";

const SLIDE_GAP = 10;
// Narrower than the row, so the next slide peeks in at the edge.
const SLIDE_SIZE = { base: "92%", md: "88%" };
// Above this the dots stop telling slides apart, so a counter stands in.
const MAX_DOTS = 10;
const DOT = 4;
const ACTIVE_DOT = 16;
// The viewport clips, so it is padded for the card's cast shadow and pulled back by as much.
const SHADOW_ROOM = 18;
// Home's phone gutter: the row runs to the screen edge, so the peeking slide is cut there.
const PHONE_GUTTER = "var(--mantine-spacing-md)";
// A step under the chip, so the bike name keeps the room in a desktop column.
const ARROW_SIZE = 28;

const SLIDE_STYLE: CSSProperties = {
  backgroundColor: "var(--mantine-color-cards-6)",
  backgroundImage: "var(--card-glow)",
  border: "none",
  boxShadow: "var(--elev-panel)",
};

interface ForecastCarouselProps {
  slides: WearForecastItem[];
  title: ReactNode;
  bikeChip: ReactNode;
  onOpen: (item: WearForecastItem) => void;
}

export function ForecastCarousel({ slides, title, bikeChip, onOpen }: ForecastCarouselProps): ReactElement {
  const { t } = useTranslation();
  const isDesktop = useIsDesktop();
  const [embla, setEmbla] = useState<EmblaCarouselType | null>(null);
  const [selected, setSelected] = useState(0);
  const several = slides.length > 1;
  // A refetch can drop a slide from under the one shown.
  const current = Math.min(selected, slides.length - 1);

  return (
    <Stack gap={10}>
      <Group justify="space-between" wrap="nowrap" gap={8} px={6}>
        {title}
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          {isDesktop && several && <SlideArrows embla={embla} />}
          {bikeChip}
        </Group>
      </Group>

      <Carousel
        aria-label={t("stats.forecastTitle")}
        slideSize={several ? SLIDE_SIZE : "100%"}
        slideGap={SLIDE_GAP}
        withControls={false}
        emblaOptions={{ align: "start" }}
        getEmblaApi={setEmbla}
        onSlideChange={setSelected}
        mx={isDesktop ? undefined : `calc(${PHONE_GUTTER} * -1)`}
        styles={{
          viewport: {
            paddingInline: isDesktop ? undefined : PHONE_GUTTER,
            paddingBlock: SHADOW_ROOM,
            marginBlock: -SHADOW_ROOM,
          },
        }}
      >
        {slides.map((item) => (
          <Carousel.Slide key={trackedActionKey(item)}>
            <ForecastSlide item={item} onOpen={() => onOpen(item)} />
          </Carousel.Slide>
        ))}
      </Carousel>

      {several && <SlideIndicator slides={slides} current={current} onPick={(index) => embla?.scrollTo(index)} />}
    </Stack>
  );
}

// A very good reading warns of nothing, so its words and dot stay neutral; the chart still draws it green.
function levelColor(item: WearForecastItem, neutral: string): string {
  return item.percentage < QUIET_BELOW ? neutral : attentionColor(item.percentage);
}

// Opens the same drawer the Attention card does; a drag is never taken for a tap.
function ForecastSlide({ item, onOpen }: { item: WearForecastItem; onOpen: () => void }): ReactElement {
  const { t, i18n } = useTranslation();
  const spoken = levelColor(item, "var(--mantine-color-text-7)");

  return (
    <UnstyledButton
      onClick={onOpen}
      className="hover-veil"
      h="100%"
      w="100%"
      style={{ display: "block", borderRadius: "var(--mantine-radius-lg)" }}
    >
      <Paper radius="lg" p="md" h="100%" style={SLIDE_STYLE}>
        <Group justify="space-between" align="baseline" wrap="nowrap" gap={12}>
          <Text fz={15} fw={600} c="text.6" lineClamp={2}>
            {catalogueLabel(item.action_i18n_key, item.action_name, t)}
          </Text>
          <Text className="tabular-nums" fz={14} fw={500} c={spoken} style={{ flexShrink: 0, whiteSpace: "nowrap" }}>
            {forecastNote(item, t)}
          </Text>
        </Group>
        <Box mt={18}>
          <ForecastChart item={item} />
        </Box>
        <Group justify="space-between" wrap="nowrap" gap={12} mt={12} className="tabular-nums" fz={12} lh="16px">
          <Text span inherit c="text.7" style={{ flexShrink: 0 }}>
            {`${t("stats.forecastWear")} ${t("tracking.percentage", { value: item.percentage })}`}
          </Text>
          <Text span inherit c={spoken} fw={item.percentage < QUIET_BELOW ? 400 : 500} lineClamp={1}>
            {remainingLabel(item, i18n.language, t)}
          </Text>
        </Group>
      </Paper>
    </UnstyledButton>
  );
}

// Desktop has no swipe, so the header carries a step either way.
function SlideArrows({ embla }: { embla: EmblaCarouselType | null }): ReactElement {
  const { t } = useTranslation();

  return (
    <Group gap={2} wrap="nowrap" style={{ flexShrink: 0 }}>
      <ActionIcon
        variant="outline"
        size={ARROW_SIZE}
        radius="xl"
        aria-label={t("stats.forecastPrevious")}
        disabled={embla?.canScrollPrev() !== true}
        onClick={() => embla?.scrollPrev()}
      >
        <ChevronLeft size={16} />
      </ActionIcon>
      <ActionIcon
        variant="outline"
        size={ARROW_SIZE}
        radius="xl"
        aria-label={t("stats.forecastNext")}
        disabled={embla?.canScrollNext() !== true}
        onClick={() => embla?.scrollNext()}
      >
        <ChevronRight size={16} />
      </ActionIcon>
    </Group>
  );
}

interface SlideIndicatorProps {
  slides: WearForecastItem[];
  current: number;
  onPick: (index: number) => void;
}

// Each dot wears its slide's Attention Level, so what is due shows before it is swiped to.
function SlideIndicator({ slides, current, onPick }: SlideIndicatorProps): ReactElement {
  const { t } = useTranslation();

  if (slides.length > MAX_DOTS) {
    return (
      <Text ta="center" className="tabular-nums" fz={12} lh="16px" c="text.8">
        {`${String(current + 1)} / ${String(slides.length)}`}
      </Text>
    );
  }

  return (
    <Group justify="center" gap={0} h={16} wrap="nowrap">
      {slides.map((item, index) => {
        const active = index === current;
        return (
          // Padded past the dot, so the gap between dots is still a target.
          <UnstyledButton
            key={trackedActionKey(item)}
            aria-label={catalogueLabel(item.action_i18n_key, item.action_name, t)}
            aria-current={active}
            onClick={() => onPick(index)}
            px={2.5}
            py={6}
          >
            <Box
              w={active ? ACTIVE_DOT : DOT}
              h={DOT}
              style={{
                borderRadius: DOT / 2,
                backgroundColor: active
                  ? levelColor(item, "var(--mantine-color-text-6)")
                  : levelColor(item, "var(--mantine-color-cards-5)"),
                transition: "width 0.2s ease",
              }}
            />
          </UnstyledButton>
        );
      })}
    </Group>
  );
}
