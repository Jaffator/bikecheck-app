// The eval runner. It seeds the eval garage, then puts every question to the real model through
// AiChatService - no HTTP, no guard, no throttle, because none of those are what is being
// measured. Each item runs three times and passes on two of them, which is what tells a
// regression apart from the model having an off moment.
//
//   npm run chat:eval             every question
//   npm run chat:eval -- A5 D6    only these
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AiChatService } from '../../src/ai-chat/ai-chat.service';
import { ServiceTrackingModule } from '../../src/service-tracking/service-tracking.module';
import { ServiceTrackingService } from '../../src/service-tracking/service-tracking.service';
import type { ChatStreamEvent } from '../../src/ai-chat/ai-chat.types';
import { CHAIN_PERCENTAGE, CHAIN_REPLACEMENT, FORK_PERCENTAGE, dayAgo } from './fixture';
import { QUESTIONS, type EvalCheck, type EvalItem, type Needle } from './questions';
import { evalPrisma, seedEvalGarage, type SeededGarage } from './seed_eval';

// Three runs and a majority: two of three is a pass, so one bad draw does not read as a break.
const RUNS_PER_ITEM = 3;
const RUNS_TO_PASS = 2;

// Everything AiChatService needs and nothing the API adds. The queue is only here because the
// tracking service reaches for notifications, which register one.
@Module({
  imports: [
    LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
    BullModule.forRoot({ connection: { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 } }),
    PrismaModule,
    ServiceTrackingModule,
  ],
  providers: [AiChatService],
})
class ChatEvalModule {}

// What one tool call asked for. The names decide a check; the arguments are what a failure is
// read back from - "it called the tool" and "it called it with a filter nobody asked for" look
// the same until you see them.
interface ToolCall {
  tool: string;
  arguments: unknown;
}

interface TurnResult {
  answer: string;
  tools: string[];
  calls: ToolCall[];
}

interface RunResult {
  passed: boolean;
  reasons: string[];
  answer: string;
  calls: ToolCall[];
}

interface ItemResult {
  id: string;
  category: string;
  passed: boolean;
  runs: RunResult[];
}

// Numbers are read, not spelled: "1 620 Kc", "1620,-" and "1620" are the same answer, and so are
// "řetěz" and "retez". Everything is folded down to that before a check looks at it.
function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d)[\s  ](?=\d)/g, '$1');
}

// Roughly how many sentences an answer runs to. A refusal that goes on is not a refusal.
function sentences(text: string): number {
  return text.split(/[.!?]+\s/).filter((part) => part.trim().length > 0).length;
}

// The date the chain was last replaced, in both shapes the model writes it in Czech.
function chainReplacementForms(): string[] {
  const date = dayAgo(CHAIN_REPLACEMENT.daysAgo);
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const monthNames = [
    'ledna',
    'unora',
    'brezna',
    'dubna',
    'kvetna',
    'cervna',
    'cervence',
    'srpna',
    'zari',
    'rijna',
    'listopadu',
    'prosince',
  ];

  // The month on its own is enough to tell this service from every other one in the fixture,
  // and it is what survives "druhého června tohoto roku" - a correct answer written in words.
  return [
    `${String(day)}. ${monthNames[month - 1]}`,
    `${String(day)}.${String(month)}.${String(year)}`,
    monthNames[month - 1],
  ];
}

// One of these forms is enough, which is how a figure is checked without grading the wording.
function anyForm(answer: string, forms: string[]): boolean {
  return forms.some((form) => normalise(answer).includes(normalise(form)));
}

// A needle is either one string or a set of forms any of which will do.
function found(answer: string, needle: Needle): boolean {
  return anyForm(answer, typeof needle === 'string' ? [needle] : needle);
}

// How a needle reads in a failure line.
function needleText(needle: Needle): string {
  return typeof needle === 'string' ? needle : needle.join(' / ');
}

function checkRun(item: EvalItem, result: TurnResult): RunResult {
  const check: EvalCheck = item.check;
  const reasons: string[] = [];

  for (const needle of check.must ?? []) {
    if (!found(result.answer, needle)) reasons.push(`chybi "${needleText(needle)}"`);
  }

  for (const needle of check.mustNot ?? []) {
    if (found(result.answer, needle)) reasons.push(`obsahuje "${needleText(needle)}"`);
  }

  for (const tool of check.tools ?? []) {
    if (!result.tools.includes(tool)) reasons.push(`nevolal ${tool}`);
  }

  if (check.noTools === true && result.tools.length > 0) {
    reasons.push(`volal ${result.tools.join(', ')}`);
  }

  if (check.maxSentences !== undefined && sentences(result.answer) > check.maxSentences) {
    reasons.push(`${String(sentences(result.answer))} vet, povoleno ${String(check.maxSentences)}`);
  }

  // The one check a substring cannot carry: a date has two shapes and both are correct.
  if (item.id === 'A5' && !anyForm(result.answer, chainReplacementForms())) {
    reasons.push(`chybi datum ${chainReplacementForms().join(' / ')}`);
  }

  return { passed: reasons.length === 0, reasons, answer: result.answer, calls: result.calls };
}

// One item, start to finish: the thread is emptied first, so the questions cannot bleed into
// each other and the budget window starts over.
async function runItem(
  chat: AiChatService,
  prisma: PrismaService,
  garage: SeededGarage,
  item: EvalItem,
): Promise<TurnResult> {
  await chat.deleteThread(garage.userId);

  let last: TurnResult = { answer: '', tools: [], calls: [] };

  for (const turn of item.turns) {
    const bikeId = turn.bike === undefined ? undefined : garage.bikeIds.get(turn.bike);

    let messageId: number | null = null;
    const emit = (event: ChatStreamEvent): void => {
      if (event.type === 'done') messageId = event.message.id;
    };

    await chat.ask(garage.userId, { question: turn.question, bike_id: bikeId }, emit);

    if (messageId === null) {
      last = { answer: '', tools: [], calls: [] };
      continue;
    }

    // What the model actually reached for, read from what the turn itself recorded.
    const calls = await prisma.chat_tool_calls.findMany({
      where: { message_id: messageId },
      orderBy: { id: 'asc' },
      select: { tool_name: true, arguments: true },
    });
    const message = await prisma.chat_messages.findUnique({
      where: { id: messageId },
      select: { content: true },
    });

    last = {
      answer: message?.content ?? '',
      tools: calls.map((call) => call.tool_name),
      calls: calls.map((call) => ({ tool: call.tool_name, arguments: call.arguments })),
    };
  }

  return last;
}

function line(result: ItemResult): string {
  const mark = result.passed ? 'PASS' : 'FAIL';
  const passes = result.runs.filter((run) => run.passed).length;
  const why = result.passed ? '' : ` - ${[...new Set(result.runs.flatMap((run) => run.reasons))].join('; ')}`;

  return `${mark} ${result.id} (${String(passes)}/${String(RUNS_PER_ITEM)})${why}`;
}

// The two wear readings the questions quote are arithmetic the app owns, not numbers the seed
// can write. So they are read back before a single question is asked: a fixture that no longer
// produces them would otherwise read as the chat inventing figures.
async function verifyReadings(tracking: ServiceTrackingService, garage: SeededGarage): Promise<void> {
  const readings = await tracking.getGarageTrackedActions(garage.userId, 0);
  const percentages = readings.map((row) => row.percentage).sort((one, other) => other - one);
  const expected = [CHAIN_PERCENTAGE, FORK_PERCENTAGE];

  if (percentages.length !== expected.length || percentages.some((value, index) => value !== expected[index])) {
    throw new Error(
      `The fixture no longer reads as ${expected.join(' / ')} percent but as ${percentages.join(' / ')}. ` +
        'Fix fixture.ts before trusting a run.',
    );
  }
}

async function main(): Promise<void> {
  const wanted = process.argv.slice(2);
  const items = wanted.length === 0 ? QUESTIONS : QUESTIONS.filter((item) => wanted.includes(item.id));
  if (items.length === 0) {
    throw new Error(`No question matches ${wanted.join(', ')}`);
  }

  const seedPrisma = evalPrisma();
  let garage: SeededGarage;
  try {
    garage = await seedEvalGarage(seedPrisma);
  } finally {
    await seedPrisma.$disconnect();
  }

  const app = await NestFactory.createApplicationContext(ChatEvalModule, { logger: false });
  const chat = app.get(AiChatService);
  const prisma = app.get(PrismaService);
  await verifyReadings(app.get(ServiceTrackingService), garage);

  const results: ItemResult[] = [];

  try {
    for (const item of items) {
      const runs: RunResult[] = [];

      for (let attempt = 0; attempt < RUNS_PER_ITEM; attempt += 1) {
        runs.push(checkRun(item, await runItem(chat, prisma, garage, item)));
      }

      const result: ItemResult = {
        id: item.id,
        category: item.category,
        passed: runs.filter((run) => run.passed).length >= RUNS_TO_PASS,
        runs,
      };

      results.push(result);
      console.log(line(result));
    }
  } finally {
    await app.close();
  }

  const passed = results.filter((result) => result.passed).length;
  console.log(`\n${String(passed)}/${String(results.length)} proslo.`);

  // The whole of every answer, so a failure can be read without paying for the run again.
  const output = path.join(__dirname, 'last-run.json');
  writeFileSync(output, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2), 'utf8');
  console.log(`Detaily: ${output}`);

  process.exitCode = passed === results.length ? 0 : 1;
}

void main();
