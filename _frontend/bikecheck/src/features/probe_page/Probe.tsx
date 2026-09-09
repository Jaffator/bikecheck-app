import { useRef, useState, type ReactElement } from "react";
import { Badge, Button, Group, Stack, Text, Title } from "@mantine/core";

// Throwaway probe page for #76: does a held NDJSON response arrive line by line inside
// the Capacitor WebView? Mounted outside the auth gate, so it still loads when the
// session cookie does not travel - otherwise a cookie failure would look like a
// streaming failure. Strings are hardcoded on purpose; this never ships.

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

// Every line the server wrote, with when it was written and when it landed.
interface Line {
  index: number;
  serverMs: number;
  clientMs: number;
  gapMs: number;
}

// Gaps at least this long mean the line waited for its own turn rather than arriving in
// a burst with its neighbours. The server writes every 500 ms, so a real chunk lands
// around there and a buffered one lands within a millisecond of the line before it.
const PROGRESSIVE_GAP_MS = 250;

export function Probe(): ReactElement {
  const [lines, setLines] = useState<Line[]>([]);
  const [running, setRunning] = useState<boolean>(false);
  const [outcome, setOutcome] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  async function run(path: string, withCookie: boolean): Promise<void> {
    const controller = new AbortController();
    abortRef.current = controller;
    setLines([]);
    setOutcome("");
    setRunning(true);

    const startedAt = Date.now();
    let previousMs = 0;
    let received = 0;

    try {
      const response = await fetch(`${BASE_URL}${path}?seconds=90`, {
        method: "POST",
        signal: controller.signal,
        ...(withCookie ? { credentials: "include" as const } : {}),
      });

      if (!response.ok) {
        setOutcome(`HTTP ${response.status} ${response.statusText} — nedoteklo se to ke streamu`);
        return;
      }
      if (response.body === null) {
        setOutcome("response.body je null — WebView tenhle fetch nestreamuje vůbec");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        const clientMs = Date.now() - startedAt;
        buffer += decoder.decode(value, { stream: true });

        // NDJSON: a chunk can carry half a line, or several at once.
        const parts = buffer.split("\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          if (part.trim() === "") continue;
          const parsed = JSON.parse(part) as { i?: number; elapsed_ms?: number; done?: boolean };
          if (parsed.done === true) continue;

          received += 1;
          const line: Line = {
            index: parsed.i ?? received,
            serverMs: parsed.elapsed_ms ?? 0,
            clientMs,
            gapMs: clientMs - previousMs,
          };
          previousMs = clientMs;
          setLines((current) => [...current, line]);
        }
      }

      setOutcome(`Dojelo do konce: ${received} řádků za ${Math.round((Date.now() - startedAt) / 1000)} s`);
    } catch (error) {
      const named = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      setOutcome(`Spadlo po ${Math.round((Date.now() - startedAt) / 1000)} s a ${received} řádcích — ${named}`);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function stop(): void {
    abortRef.current?.abort();
  }

  // The whole question in one word. A buffered body arrives as one burst, so almost
  // every gap is near zero however many lines came through.
  const progressive = lines.filter((line) => line.gapMs >= PROGRESSIVE_GAP_MS).length;
  const verdict = lines.length === 0 ? null : progressive > lines.length * 0.8;

  return (
    <Stack p="md" gap="sm">
      <Title order={3}>Stream probe #76</Title>

      <Text size="xs" c="dimmed">
        origin {window.location.origin}
        <br />
        api {BASE_URL}
      </Text>

      <Group gap="xs">
        <Button size="xs" disabled={running} onClick={() => void run("/probe/stream", false)}>
          Start bez cookie
        </Button>
        <Button size="xs" variant="light" disabled={running} onClick={() => void run("/probe/stream-auth", true)}>
          Start s cookie
        </Button>
        <Button size="xs" color="red" variant="light" disabled={!running} onClick={stop}>
          Stop
        </Button>
      </Group>

      {verdict !== null && (
        <Badge color={verdict ? "green" : "red"} size="lg">
          {verdict ? "chunky chodí průběžně" : "tělo dorazilo naráz"}
        </Badge>
      )}

      <Text size="sm">
        řádků {lines.length} · průběžných {progressive} · poslední server {lines.at(-1)?.serverMs ?? 0} ms / klient{" "}
        {lines.at(-1)?.clientMs ?? 0} ms
      </Text>

      {outcome !== "" && <Text size="sm" fw={600}>{outcome}</Text>}

      <Stack gap={2} className="max-h-80 overflow-y-auto font-mono text-xs">
        {lines.slice(-40).map((line) => (
          <Text key={line.index} size="xs" ff="monospace">
            #{line.index} server {line.serverMs} ms · klient {line.clientMs} ms · mezera {line.gapMs} ms
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}
