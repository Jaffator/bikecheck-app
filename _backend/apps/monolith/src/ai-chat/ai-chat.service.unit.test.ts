import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';
import { MockLanguageModelV3 } from 'ai/test';
import type { LanguageModelV3CallOptions, LanguageModelV3GenerateResult, LanguageModelV3Usage } from '@ai-sdk/provider';
import { AiChatService } from './ai-chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ServiceTrackingService } from '../service-tracking/service-tracking.service';
import type { ChatStreamEvent } from './ai-chat.types';

const OWNER_ID = 7;
const BIKE_ID = 21;
const CREATED_AT = new Date('2026-09-09T08:39:40.000Z');

// The garage the tool reads, in the shape the query selects it.
const GARAGE = [
  {
    id: BIKE_ID,
    bike_brand: 'Santa Cruz',
    bike_model: 'Hightower',
    total_km: 4300,
    total_time_min: 12_000,
    total_elevation_m: 51_000,
    components_mounted: [
      {
        id: 55,
        component_type_id: 12,
        component_desc: 'Shimano XT M8100',
        position: null,
        total_km: 1240,
        total_time_min: 3600,
        component_types: { component_type: 'Chain' },
      },
    ],
  },
];

function usage(input: number, output: number): LanguageModelV3Usage {
  return {
    inputTokens: { total: input, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: output, text: undefined, reasoning: undefined },
  };
}

function saysText(text: string): LanguageModelV3GenerateResult {
  return {
    content: [{ type: 'text', text }],
    finishReason: { unified: 'stop', raw: 'stop' },
    usage: usage(10, 5),
    warnings: [],
  };
}

function callsGarage(toolCallId: string): LanguageModelV3GenerateResult {
  return {
    content: [{ type: 'tool-call', toolCallId, toolName: 'get_garage', input: '{}' }],
    finishReason: { unified: 'tool-calls', raw: 'tool_calls' },
    usage: usage(10, 5),
    warnings: [],
  };
}

// A round with tools is a round the model may still call one in; the last turn has none.
function hasTools(options: LanguageModelV3CallOptions): boolean {
  return (options.tools ?? []).length > 0;
}

// One past turn as the thread stores it, newest message first - the order the history is read
// in. `answerChars` is what makes a turn expensive enough to be cut.
function storedTurn(index: number, answerChars: number): { role: string; content: string }[] {
  return [
    { role: 'assistant', content: `answer-${String(index)} ${'a'.repeat(answerChars)}` },
    { role: 'user', content: `question-${String(index)}` },
  ];
}

function abortError(): Error {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
}

// How a stub answers: one result per call, or a function that decides per call.
type MockedGenerate = NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>['doGenerate'];

// What one write of the thread was asked to store.
interface CreateArg {
  data: {
    role: string;
    content: string;
    bike_id: number | null;
    total_tokens?: number;
    chat_tool_calls?: { create: unknown[] };
  };
}

describe('AiChatService', () => {
  let service: AiChatService;
  let events: ChatStreamEvent[];

  const mockPrisma = {
    users: { findUnique: jest.fn() },
    bikes: { findFirst: jest.fn(), findMany: jest.fn() },
    chat_messages: { create: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  // The wear readings are the one tool the loop does not read through Prisma.
  const mockServiceTracking = { getGarageTrackedActions: jest.fn() };

  const mockLogger = { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };

  // The model in the service's place, which is the seam the loop is tested through.
  function stub(doGenerate: MockedGenerate): MockLanguageModelV3 {
    const model = new MockLanguageModelV3({ doGenerate });
    Reflect.set(service, 'model', model);
    return model;
  }

  function created(): CreateArg[] {
    return mockPrisma.chat_messages.create.mock.calls.map(([arg]: [CreateArg]) => arg);
  }

  function emit(event: ChatStreamEvent): void {
    events.push(event);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    events = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ServiceTrackingService, useValue: mockServiceTracking },
        { provide: getLoggerToken(AiChatService.name), useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AiChatService>(AiChatService);

    mockPrisma.users.findUnique.mockResolvedValue({ language: 'cs', currency: 'CZK' });
    mockPrisma.bikes.findFirst.mockResolvedValue(null);
    mockPrisma.bikes.findMany.mockResolvedValue(GARAGE);
    mockPrisma.chat_messages.findMany.mockResolvedValue([]);
    mockServiceTracking.getGarageTrackedActions.mockResolvedValue([]);
    mockPrisma.$transaction.mockImplementation((work: (tx: typeof mockPrisma) => Promise<unknown>) => work(mockPrisma));
    mockPrisma.chat_messages.create.mockImplementation(({ data }: CreateArg) =>
      Promise.resolve({
        id: data.role === 'assistant' ? 2 : 1,
        role: data.role,
        content: data.content,
        bike_id: data.bike_id,
        created_at: CREATED_AT,
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('writes the whole turn and what the model did, but never what a tool returned', async () => {
    stub([callsGarage('call-1'), saysText('You have a Santa Cruz Hightower.')]);

    await service.ask(OWNER_ID, { question: 'Jaká mám kola?' }, emit);

    expect(events).toEqual([
      { type: 'step', tool: 'get_garage' },
      {
        type: 'done',
        message: {
          id: 2,
          role: 'assistant',
          content: 'You have a Santa Cruz Hightower.',
          bike_id: null,
          created_at: CREATED_AT.toISOString(),
        },
      },
    ]);

    const writes = created();
    expect(writes.map((write) => write.data.role)).toEqual(['user', 'assistant']);
    expect(writes[0].data.content).toBe('Jaká mám kola?');
    expect(writes[1].data.total_tokens).toBe(30);
    expect(writes[1].data.chat_tool_calls?.create).toEqual([
      {
        tool_name: 'get_garage',
        arguments: {},
        row_count: 1,
        truncated: false,
        duration_ms: expect.any(Number) as number,
      },
    ]);

    // Nothing of what the tool answered reaches the row.
    expect(JSON.stringify(writes[1])).not.toContain('Shimano');
  });

  it('sends a last turn with the tools switched off when the rounds run out', async () => {
    const model = stub((options) =>
      Promise.resolve(
        hasTools(options) ? callsGarage(`call-${String(options.prompt.length)}`) : saysText('Ten rounds in.'),
      ),
    );

    await service.ask(OWNER_ID, { question: 'Jaká mám kola?' }, emit);

    // Ten rounds with tools, then one without - the cap is a stopping rule, not an error.
    expect(model.doGenerateCalls).toHaveLength(11);
    expect(model.doGenerateCalls[10].tools ?? []).toHaveLength(0);
    expect(JSON.stringify(model.doGenerateCalls[10].prompt)).toContain('no tools left');
    expect(events.filter((event) => event.type === 'step')).toHaveLength(10);
    expect(events.at(-1)).toEqual({ type: 'done', message: expect.objectContaining({ content: 'Ten rounds in.' }) });
  });

  it('answers from what it read when the minute runs out', async () => {
    let reachedModel: () => void = () => undefined;
    const inTheModel = new Promise<void>((resolve) => {
      reachedModel = resolve;
    });

    stub(async (options) => {
      if (!hasTools(options)) return saysText('From what I read, you have one bike.');

      reachedModel();
      return await new Promise<LanguageModelV3GenerateResult>((_resolve, reject) => {
        options.abortSignal?.addEventListener('abort', () => reject(abortError()));
      });
    });

    jest.useFakeTimers();
    const asking = service.ask(OWNER_ID, { question: 'Jaká mám kola?' }, emit);
    await inTheModel;
    await jest.advanceTimersByTimeAsync(60_000);
    await asking;

    expect(events.at(-1)).toEqual({
      type: 'done',
      message: expect.objectContaining({ content: 'From what I read, you have one bike.' }),
    });
    expect(created().map((write) => write.data.role)).toEqual(['user', 'assistant']);
  });

  it('writes nothing at all when the turn fails, not even the question', async () => {
    stub(() => Promise.reject(new Error('the provider is down')));

    await service.ask(OWNER_ID, { question: 'Jaká mám kola?' }, emit);

    expect(events).toEqual([{ type: 'error', reason: 'failed' }]);
    expect(mockPrisma.chat_messages.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it('reads a bike that is not the caller as no selection at all', async () => {
    stub([saysText('You have a Santa Cruz Hightower.')]);

    await service.ask(OWNER_ID, { question: 'Jaká mám kola?', bike_id: 999 }, emit);

    expect(created()[1].data.bike_id).toBeNull();
  });

  it('cuts the history at whole turns, dropping the oldest first', async () => {
    // Four turns of ~1 515 tokens each: two fit in the 4 000 the model is told, the rest go.
    mockPrisma.chat_messages.findMany.mockResolvedValue([
      ...storedTurn(4, 4500),
      ...storedTurn(3, 4500),
      ...storedTurn(2, 4500),
      ...storedTurn(1, 4500),
    ]);
    const model = stub([saysText('The other bike has 1 200 km.')]);

    await service.ask(OWNER_ID, { question: 'A co to druhé kolo?' }, emit);

    // Question and answer, twice, then the new question - never a question without its answer.
    const prompt = model.doGenerateCalls[0].prompt;
    expect(prompt.map((message) => message.role)).toEqual(['system', 'user', 'assistant', 'user', 'assistant', 'user']);

    const sent = JSON.stringify(prompt);
    expect(sent).toContain('question-3');
    expect(sent).toContain('answer-3');
    expect(sent).toContain('question-4');
    expect(sent).toContain('answer-4');
    expect(sent).not.toContain('question-2');
    expect(sent).not.toContain('answer-2');
    expect(sent).not.toContain('question-1');
    expect(sent).not.toContain('answer-1');
  });

  it('never cuts the current question, however little history fits', async () => {
    // One turn that alone costs more than the whole budget: the history goes, the question stays.
    mockPrisma.chat_messages.findMany.mockResolvedValue(storedTurn(1, 30_000));
    const model = stub([saysText('You have a Santa Cruz Hightower.')]);

    await service.ask(OWNER_ID, { question: 'Jaká mám kola?' }, emit);

    const prompt = model.doGenerateCalls[0].prompt;
    expect(prompt.map((message) => message.role)).toEqual(['system', 'user']);
    expect(JSON.stringify(prompt)).toContain('Jaká mám kola?');
    expect(JSON.stringify(prompt)).not.toContain('question-1');
    expect(events.at(-1)).toEqual({
      type: 'done',
      message: expect.objectContaining({ content: 'You have a Santa Cruz Hightower.' }),
    });
  });

  it('reads the thread of the logged-in user, oldest first', async () => {
    mockPrisma.chat_messages.findMany.mockResolvedValue([
      { id: 1, role: 'user', content: 'Jaká mám kola?', bike_id: BIKE_ID, created_at: CREATED_AT },
      { id: 2, role: 'assistant', content: 'One.', bike_id: BIKE_ID, created_at: CREATED_AT },
    ]);

    const thread = await service.getThread(OWNER_ID);

    expect(mockPrisma.chat_messages.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { user_id: OWNER_ID } }),
    );
    expect(thread.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(thread[0].created_at).toBe(CREATED_AT.toISOString());
  });
});
