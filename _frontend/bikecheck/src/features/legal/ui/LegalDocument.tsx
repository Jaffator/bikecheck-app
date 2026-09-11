// Sets a legal document from its blocks. No markdown, no dependency: a block is a heading
// and its paragraphs, which is all the format holds.
import type { ReactElement } from "react";
import { Stack, Text } from "@mantine/core";
import type { LegalBlock } from "../legal.types";

export function LegalDocument({ blocks }: { blocks: LegalBlock[] }): ReactElement {
  return (
    <Stack gap="xl">
      {blocks.map((block, blockIndex) => (
        <Stack key={blockIndex} gap="xs">
          <Text fz={15} fw={600} lh={1.4} c="text.6">
            {block.heading}
          </Text>
          {block.paragraphs.map((paragraph, paragraphIndex) => (
            <Text key={paragraphIndex} fz={14} lh={1.65} c="var(--color-text-dim)">
              {paragraph}
            </Text>
          ))}
        </Stack>
      ))}
    </Stack>
  );
}
