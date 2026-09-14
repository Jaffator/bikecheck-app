import axios from 'axios';
import { createInterface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { ChatStreamEvent } from '../../src/ai-chat/ai-chat.types';
import type { ResponseChatDeletedDto } from '../../src/ai-chat/dto/response-chat-deleted.dto';
import type { ResponseChatMessageDto } from '../../src/ai-chat/dto/response-chat-message.dto';
import type { Response_GarageTrackedActionDto } from '../../src/service-tracking/dto/response-garage-tracked-action';

// The eval talks to the running app over HTTP rather than to the service in process: what a
// change of prompt, model or tool contract does is only visible through the whole path the phone
// takes - the guard, the throttle, the loop and the held connection.

// POST /ai-chat is throttled at ten a minute per user, so the run keeps one slot spare: a clock
// difference between the script and the app must not cost the eval a 429.
const ASKS_PER_WINDOW = 9;
const ASK_WINDOW_MS = 60_000;

// The app gives one turn a minute and then one last turn without tools, so the line may be held
// for well over that before an answer arrives.
const ASK_TIMEOUT_MS = 180_000;

// One answered turn, as the eval reads it back.
export interface ChatAnswer {
  message_id: number;
  content: string;
  // The tools the line announced, one per round, in order. Read, never compared.
  steps: string[];
}

// The app as one logged-in user, holding the cookie the login handed out. Read-only apart from
// the thread it clears before a run: the eval asks questions, it does not change data.
export class ChatClient {
  private cookie = '';
  // When each question was sent, so the run paces itself under the route's own limit.
  private readonly sent: number[] = [];

  constructor(private readonly baseUrl: string) {}

  // The password login, which is the only one a script can drive - the Google flow needs a
  // browser. The access token cookie is what every later call carries.
  async login(email: string, password: string): Promise<void> {
    const response = await axios.post<unknown>(`${this.baseUrl}/auth/login`, { email, password });
    const raw: unknown = response.headers['set-cookie'];

    this.cookie = cookieHeader(raw);
  }

  // The thread, emptied before a run: a question answered out of an earlier turn's answer is not
  // the question the eval asked.
  async deleteThread(): Promise<number> {
    const response = await axios.delete<ResponseChatDeletedDto>(`${this.baseUrl}/ai-chat/thread`, {
      headers: this.headers(),
    });

    return response.data.count;
  }

  // The app's own Tracked Actions, read through the endpoint the dashboard reads. This is where a
  // wear figure is checked against: the weighting lives in ServiceTrackingService, and an eval
  // that re-derived it would be checking the eval.
  async trackedActions(minPercentage: number): Promise<Response_GarageTrackedActionDto[]> {
    const response = await axios.get<Response_GarageTrackedActionDto[]>(`${this.baseUrl}/service-tracking/attention`, {
      params: { minPercentage },
      headers: this.headers(),
    });

    return response.data;
  }

  // One question, answered on a held connection. The status is read rather than thrown on, so a
  // throttled or refused turn is reported as what it was instead of as a stack.
  async ask(question: string): Promise<ChatAnswer> {
    await this.waitForSlot();
    this.sent.push(Date.now());

    const response = await axios.post<Readable>(
      `${this.baseUrl}/ai-chat`,
      { question },
      {
        headers: this.headers(),
        responseType: 'stream',
        timeout: ASK_TIMEOUT_MS,
        validateStatus: () => true,
      },
    );

    if (response.status !== 200) {
      response.data.destroy();
      throw new Error(`POST /ai-chat answered ${response.status}`);
    }

    return await readAnswer(response.data);
  }

  // Waits until the route's window has room. Ten questions run slower than the window anyway,
  // so this usually waits for nothing - it is here for the run that does not.
  private async waitForSlot(): Promise<void> {
    if (this.sent.length < ASKS_PER_WINDOW) return;

    const oldest = this.sent[this.sent.length - ASKS_PER_WINDOW];
    const wait = oldest + ASK_WINDOW_MS - Date.now();
    if (wait <= 0) return;

    console.log(`  waiting ${Math.ceil(wait / 1000)} s for the rate limit window`);
    await sleep(wait);
  }

  private headers(): Record<string, string> {
    return { Cookie: this.cookie };
  }
}

// The NDJSON line read to its end: `step` names the tool a round started with, `ping` says
// nothing, and the turn finishes on `done` or `error`.
async function readAnswer(stream: Readable): Promise<ChatAnswer> {
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const steps: string[] = [];
  let message: ResponseChatMessageDto | null = null;
  let failure: string | null = null;

  for await (const line of lines) {
    if (line.trim() === '') continue;

    const event = JSON.parse(line) as ChatStreamEvent;
    if (event.type === 'step') steps.push(event.tool);
    if (event.type === 'done') message = event.message;
    if (event.type === 'error') {
      failure = event.retry_at === undefined ? event.reason : `${event.reason}, free again at ${event.retry_at}`;
    }
  }

  if (failure !== null) throw new Error(`the chat refused the turn: ${failure}`);
  if (message === null) throw new Error('the line ended without an answer');

  return { message_id: message.id, content: message.content, steps };
}

// The cookies of the login, folded into one request header. Only the name=value part travels:
// the flags are the browser's business.
function cookieHeader(raw: unknown): string {
  if (!Array.isArray(raw)) throw new Error('the login answered without cookies');

  const pairs = raw
    .filter((value: unknown): value is string => typeof value === 'string')
    .map((value: string) => value.split(';')[0]);

  if (!pairs.some((pair) => pair.startsWith('access_token='))) {
    throw new Error('the login answered without an access token');
  }

  return pairs.join('; ');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
