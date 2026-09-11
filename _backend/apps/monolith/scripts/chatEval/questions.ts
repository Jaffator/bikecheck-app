// What the chat is asked and what its answer has to hold. Every expected figure comes from the
// fixture, so a change to the garage moves the expectation with it.
//
// A check is deliberately blunt: a substring that must be there, one that must not, and the
// tools the turn was allowed to reach for. Anything finer would be grading prose, which is a
// second model's job and not this one's.
import {
  B1_HOURS,
  B1_PART_COUNT,
  BIKES,
  CHAIN_OVER_INTERVAL_KM,
  CHAIN_PERCENTAGE,
  FORK_PERCENTAGE,
  FORK_REMAINING_MIN,
  FORK_SETUP,
  LAST_SERVICE_COST,
  PREVIOUS_SERVICE_COST,
  RIDES_LAST_MONTH_KM,
  SERVICE_TOTAL_12M,
  SERVICE_TOTAL_ALL,
  bike,
  type BikeKey,
} from './fixture';

export type EvalCategory = 'facts' | 'gate' | 'context' | 'edges';

export interface EvalTurn {
  question: string;
  // The bike the chat header holds while the question is asked.
  bike?: BikeKey;
}

// What one check looks for. A list of forms is satisfied by any one of them: "1" and "jeden"
// are the same answer, and which one the model writes is not what is being measured.
export type Needle = string | string[];

export interface EvalCheck {
  // Every one of these must appear in the last answer, compared on normalised text.
  must?: Needle[];
  // None of these may appear in it.
  mustNot?: Needle[];
  // Tools the turn had to call. A tool called on top of these is not a failure - reading more
  // than asked is how the model checks itself.
  tools?: string[];
  // The turn must call nothing at all, which is what a refusal looks like from outside.
  noTools?: boolean;
  // A refusal that runs on is not a refusal, so the gate answers are held short.
  maxSentences?: number;
}

export interface EvalItem {
  id: string;
  category: EvalCategory;
  // One turn, or a first turn and the follow-up that is actually being tested. Only the last
  // answer is checked; the earlier ones are there to build the context.
  turns: EvalTurn[];
  check: EvalCheck;
}

const B1 = bike('B1');
const B2 = bike('B2');
const B3 = bike('B3');

// The whole garage names itself the same way everywhere: by brand, which is what the chat says.
const OTHER_BRANDS = [B2.brand, B3.brand];

// A gate answer says it cannot help and stops there. What it must not do is name the garage,
// which is the failure mode: turning a question it did not understand into a bike report.
const REFUSES: EvalCheck = { noTools: true, mustNot: [B1.brand, ...OTHER_BRANDS], maxSentences: 3 };

export const QUESTIONS: EvalItem[] = [
  // A. Facts and figures - the answers that are simply right or wrong.
  {
    id: 'A1',
    category: 'facts',
    turns: [{ question: 'Kolik mám kol?' }],
    check: { must: [[String(BIKES.length), 'tri']], tools: ['get_garage'] },
  },
  {
    id: 'A2',
    category: 'facts',
    turns: [{ question: 'Jaká kola mám?' }],
    // get_garage carries the whole build, and the answer must not: the question was about
    // bikes. One part description stands for the lot.
    check: {
      must: [B1.brand, B2.brand, B3.brand],
      mustNot: [B1.parts[0].desc, B2.parts[0].desc],
      tools: ['get_garage'],
    },
  },
  {
    id: 'A3',
    category: 'facts',
    turns: [{ question: `Kolik kilometrů má najeto ${B1.brand}?` }],
    check: { must: [String(B1.totalKm)], mustNot: [String(B2.totalKm)], tools: ['get_garage'] },
  },
  {
    id: 'A4',
    category: 'facts',
    turns: [{ question: `Kolik hodin mám najeto na ${B1.brand}?` }],
    check: { must: [String(B1_HOURS)], tools: ['get_garage'] },
  },
  {
    id: 'A5',
    category: 'facts',
    turns: [{ question: 'Kdy jsem naposledy měnil řetěz?' }],
    // The date is built from the fixture at run time - see expectedChainReplacementDate.
    check: { tools: ['get_garage', 'list_services'] },
  },
  {
    id: 'A6',
    category: 'facts',
    turns: [{ question: `Kolik mě stál servis ${B1.brand} za posledních 12 měsíců?` }],
    check: {
      must: [String(SERVICE_TOTAL_12M)],
      mustNot: [String(SERVICE_TOTAL_ALL)],
      tools: ['get_garage', 'list_services'],
    },
  },
  {
    id: 'A7',
    category: 'facts',
    turns: [{ question: 'Co stál poslední servis?' }],
    check: { must: [String(LAST_SERVICE_COST)], tools: ['get_garage', 'list_services'] },
  },
  {
    id: 'A8',
    category: 'facts',
    turns: [{ question: `Kolik dílů mám na ${B1.brand}?` }],
    check: { must: [[String(B1_PART_COUNT), 'pet']], tools: ['get_garage'] },
  },
  {
    id: 'A9',
    category: 'facts',
    turns: [{ question: 'Kolik jsem najel za poslední měsíc?' }],
    check: { must: [String(RIDES_LAST_MONTH_KM)], tools: ['get_garage', 'list_rides'] },
  },
  {
    id: 'A10',
    category: 'facts',
    turns: [{ question: 'Který díl je nejvíc opotřebený?' }],
    // How far past due is said either as the percentage or as the kilometres over it, and both
    // are the same reading. What matters is that it is the chain and that it is past.
    check: { must: ['retez', [String(CHAIN_PERCENTAGE), String(CHAIN_OVER_INTERVAL_KM)]], tools: ['list_tracked_actions'] },
  },
  {
    id: 'A11',
    category: 'facts',
    turns: [{ question: 'Používám Stravu?' }],
    // The account line in the prompt answers this on its own, so no tool is owed - only the
    // truth, which is that the account is connected.
    check: { must: [['ano', 'propojen', 'napojen', 'pripojen']] },
  },
  {
    id: 'A12',
    category: 'facts',
    turns: [{ question: 'Které kolo mám spárované se Stravou?' }],
    // Naming the bikes that are not paired is a fuller answer, not a wrong one.
    check: { must: [B1.brand], tools: ['get_garage'] },
  },

  // B. The gate - what the chat is not here for.
  { id: 'B1', category: 'gate', turns: [{ question: 'jaké je počasí' }], check: REFUSES },
  { id: 'B2', category: 'gate', turns: [{ question: 'bhkd' }], check: REFUSES },
  { id: 'B3', category: 'gate', turns: [{ question: 'napiš mi báseň o kole' }], check: REFUSES },
  { id: 'B4', category: 'gate', turns: [{ question: 'kolik stojí nový řetěz Shimano' }], check: REFUSES },
  {
    id: 'B5',
    category: 'gate',
    // General maintenance is answered, not turned away - the prompt allows a rule of thumb as
    // long as it is not passed off as a reading of this user's bike.
    turns: [{ question: 'jak často se maže řetěz?' }],
    check: { noTools: true, mustNot: [String(CHAIN_PERCENTAGE), String(B1.totalKm)] },
  },
  { id: 'B6', category: 'gate', turns: [{ question: 'smaž mi všechna kola' }], check: REFUSES },

  // C. Context - the picker above the thread and the turn before this one.
  {
    id: 'C1',
    category: 'context',
    turns: [{ question: 'Kolik má najeto?', bike: 'B1' }],
    check: { must: [String(B1.totalKm)], mustNot: [String(B2.totalKm)], tools: ['get_garage'] },
  },
  {
    id: 'C2',
    category: 'context',
    turns: [{ question: 'Kolik má najeto?', bike: 'B2' }],
    check: { must: [String(B2.totalKm)], mustNot: [String(B1.totalKm)], tools: ['get_garage'] },
  },
  {
    id: 'C3',
    category: 'context',
    turns: [{ question: `Kolik má najeto ${B1.brand}?` }, { question: `A ${B2.brand}?` }],
    check: { must: [String(B2.totalKm)], tools: ['get_garage'] },
  },
  {
    id: 'C4',
    category: 'context',
    turns: [{ question: 'Kolik stál poslední servis?', bike: 'B1' }, { question: 'A ten předtím?', bike: 'B1' }],
    check: { must: [String(PREVIOUS_SERVICE_COST)], tools: ['list_services'] },
  },
  {
    id: 'C5',
    category: 'context',
    turns: [{ question: 'Kolik mám kol?' }, { question: 'A to nejnovější?' }],
    check: { must: [B1.brand], tools: ['get_garage'] },
  },
  {
    id: 'C6',
    category: 'context',
    // The bike has no service at all. What the tool hands back when that filter matches nothing
    // is the whole garage's history - context, which must not become the answer.
    turns: [{ question: 'Kdy byl servis?', bike: 'B2' }],
    check: {
      must: [B2.brand],
      mustNot: [String(LAST_SERVICE_COST), String(PREVIOUS_SERVICE_COST)],
      tools: ['list_services'],
    },
  },

  // D. The edges - where a plausible sentence would be a lie.
  {
    id: 'D1',
    category: 'edges',
    turns: [{ question: `Kolik má najeto ${B3.brand}?` }],
    // Zero is a missing number, not a reading - in digits or spelled out. "nenajelo zadne
    // kilometry" is the shape that reached a real user.
    check: {
      mustNot: ['0 km', '0km', '0 kilometr', 'zadne kilometry', 'zadny kilometr', 'nula kilometru'],
      tools: ['get_garage'],
    },
  },
  {
    id: 'D2',
    category: 'edges',
    turns: [{ question: `Kdy jsem montoval řetěz na ${B3.brand}?` }],
    check: { tools: ['get_garage'] },
  },
  {
    id: 'D3',
    category: 'edges',
    turns: [{ question: `Kolik stál servis ${B2.brand}?` }],
    check: { mustNot: [String(LAST_SERVICE_COST), String(SERVICE_TOTAL_12M)], tools: ['get_garage', 'list_services'] },
  },
  {
    id: 'D4',
    category: 'edges',
    turns: [{ question: 'Jaký mám tlak ve vidlici?', bike: 'B2' }],
    check: { must: [String(FORK_SETUP.pressurePsi)], tools: ['get_garage', 'get_setup'] },
  },
  {
    id: 'D5',
    category: 'edges',
    // B1 has no fork at all, so any pressure in this answer was invented.
    turns: [{ question: 'Jaký mám tlak ve vidlici?', bike: 'B1' }],
    check: { mustNot: [String(FORK_SETUP.pressurePsi)], tools: ['get_garage'] },
  },
  {
    id: 'D6',
    category: 'edges',
    // An empty filtered page says the filter matched nothing, never that the user has no rides.
    turns: [{ question: 'Kolik jsem najel v roce 2019?' }],
    check: { must: ['2019'], tools: ['get_garage', 'list_rides'] },
  },
  {
    id: 'D7',
    category: 'edges',
    turns: [{ question: 'Kolik mám reportů?' }],
    check: { must: [['1', 'jeden']], tools: ['list_reports'] },
  },
  {
    id: 'D8',
    category: 'edges',
    turns: [{ question: `Je ${B2.brand} spárovaný se Stravou?` }],
    check: { tools: ['get_garage'] },
  },
  {
    id: 'D9',
    category: 'edges',
    // Asked as wear rather than as "how is it doing", which the setup answers just as well.
    turns: [{ question: `Jak daleko je vidlice ${B2.brand} do servisu?` }],
    // Said as the percentage of the interval or as the minutes left of it - the same reading.
    check: { must: [[String(FORK_PERCENTAGE), String(FORK_REMAINING_MIN)]], tools: ['list_tracked_actions'] },
  },
];
