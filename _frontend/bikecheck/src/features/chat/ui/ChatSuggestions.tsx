// Desktop chat's side card: questions to start from. A pick fills the field rather than sending,
// so it can be made about the bike before it goes.
import type { ReactElement } from "react";
import { Box, Group, Paper, Text, UnstyledButton } from "@mantine/core";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Eyebrow } from "@/components/Eyebrow";
import { PANEL_HAIRLINE } from "@/components/panelRows";

const SUGGESTION_KEYS: string[] = [
  "chat.suggestionService",
  "chat.suggestionChain",
  "chat.suggestionSpend",
  "chat.suggestionDistance",
];

const ROW_HEIGHT = 48;

export function ChatSuggestions({ onPick }: { onPick: (question: string) => void }): ReactElement {
  const { t } = useTranslation();

  return (
    <Paper
      radius="lg"
      px="md"
      pt="md"
      pb={4}
      style={{ backgroundColor: "var(--mantine-color-cards-6)", border: "none", boxShadow: "var(--elev-panel)" }}
    >
      <Box mb={4}>
        <Eyebrow>{t("chat.suggestionsTitle")}</Eyebrow>
      </Box>
      {SUGGESTION_KEYS.map((key, index) => (
        <UnstyledButton
          key={key}
          w="100%"
          mih={ROW_HEIGHT}
          onClick={() => onPick(t(key))}
          style={index === 0 ? undefined : { borderTop: PANEL_HAIRLINE }}
        >
          <Group justify="space-between" wrap="nowrap" gap="sm">
            <Text fz={14} c="text.6">
              {t(key)}
            </Text>
            <ChevronRight size={16} color="var(--color-text-dim)" style={{ flexShrink: 0 }} />
          </Group>
        </UnstyledButton>
      ))}
    </Paper>
  );
}
