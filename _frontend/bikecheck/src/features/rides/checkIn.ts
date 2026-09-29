// A ride check-in as the forms edit it, and how one reads on screen.
import { attentionColor, DUE_FROM, QUIET_COLOR } from "@/features/service_tracking/attentionLevel";
import type { CheckInStatus, CheckInSymptom, RideCheckIn } from "./rides.types";

// The order the chips stand in.
export const CHECK_IN_SYMPTOMS: CheckInSymptom[] = [
  "CREAK",
  "SHIFTING_SKIPS",
  "SOFT_BRAKE",
  "FORK_SETUP",
  "SHOCK_SETUP",
  "TIRE_LOSES_AIR",
  "HEADSET_PLAY",
  "OTHER",
];

export const CHECK_IN_NOTE_MAX_LENGTH = 500;

// Borrowed from the attention ramp: fine reads as a quiet reading, an issue as a due one.
export const CHECK_IN_COLOR: Record<CheckInStatus, string> = {
  OK: QUIET_COLOR,
  ISSUE: attentionColor(DUE_FROM),
};

// Status stays null until one is picked; symptoms survive a switch to OK and back.
export interface CheckInDraft {
  status: CheckInStatus | null;
  symptoms: CheckInSymptom[];
  note: string;
}

export function draftOf(checkIn: RideCheckIn | null, status: CheckInStatus | null = null): CheckInDraft {
  if (checkIn === null) return { status, symptoms: [], note: "" };
  return { status: status ?? checkIn.status, symptoms: checkIn.symptoms, note: checkIn.note ?? "" };
}

export function toggleSymptom(draft: CheckInDraft, symptom: CheckInSymptom): CheckInDraft {
  const symptoms = draft.symptoms.includes(symptom)
    ? draft.symptoms.filter((one) => one !== symptom)
    : [...draft.symptoms, symptom];
  return { ...draft, symptoms };
}

// What is saved: symptoms only under ISSUE, a blank note as none. Null while nothing is picked.
export function checkInOf(draft: CheckInDraft): RideCheckIn | null {
  if (draft.status === null) return null;
  const note = draft.note.trim();
  return {
    status: draft.status,
    symptoms: draft.status === "ISSUE" ? CHECK_IN_SYMPTOMS.filter((one) => draft.symptoms.includes(one)) : [],
    note: note === "" ? null : note,
  };
}

export function symptomKey(symptom: CheckInSymptom): string {
  return `checkIn.symptom.${symptom}`;
}
