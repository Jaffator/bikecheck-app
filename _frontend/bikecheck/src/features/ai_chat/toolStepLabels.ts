// The progress line, one key per tool. The stream sends the tool's bare name; the sentence
// is the user's language, so it is composed here rather than on the server.
const TOOL_STEP_KEYS: Record<string, string> = {
  get_garage: "chat.stepGarage",
  list_parts: "chat.stepParts",
  list_services: "chat.stepServices",
  list_rides: "chat.stepRides",
  get_setup: "chat.stepSetup",
  list_reports: "chat.stepReports",
  list_tracked_actions: "chat.stepTrackedActions",
};

// A round not yet announced, and a tool this build does not know, both read as work in
// progress - never as a raw tool name.
export function toolStepKey(tool: string | null): string {
  if (tool === null) return "chat.thinking";

  return TOOL_STEP_KEYS[tool] ?? "chat.thinking";
}
