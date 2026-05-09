export const SPORT_OPTIONS = [
  "football", "tennis", "basketball", "cycling", "climbing",
  "running", "volleyball", "swimming", "badminton", "table_tennis",
  "golf", "rugby", "cricket", "hockey", "skiing",
] as const;

export type Sport = typeof SPORT_OPTIONS[number];
export type SkillLevel = "beginner" | "intermediate" | "advanced" | "professional";

export const SPORT_EMOJI: Record<Sport, string> = {
  football: "⚽",
  tennis: "🎾",
  basketball: "🏀",
  cycling: "🚴",
  climbing: "🧗",
  running: "🏃",
  volleyball: "🏐",
  swimming: "🏊",
  badminton: "🏸",
  table_tennis: "🏓",
  golf: "⛳",
  rugby: "🏉",
  cricket: "🏏",
  hockey: "🏒",
  skiing: "⛷️",
};
