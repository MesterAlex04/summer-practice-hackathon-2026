import { GoogleGenAI, Type } from "@google/genai";
import { SPORT_OPTIONS, type SkillLevel } from "@/lib/sports";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ExtractedSport = { sport: string; skill_level: SkillLevel };

const SPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    sports: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sport: {
            type: Type.STRING,
            enum: SPORT_OPTIONS as unknown as string[],
          },
          skill_level: {
            type: Type.STRING,
            enum: ["beginner", "intermediate", "advanced", "professional"],
          },
        },
        required: ["sport", "skill_level"],
      },
    },
  },
  required: ["sports"],
} as const;

export async function extractSportsFromBio(bio: string): Promise<ExtractedSport[]> {
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: bio,
    config: {
      systemInstruction:
        "You extract sports interests and skill levels from user profile bios. " +
        "Only include sports explicitly mentioned or strongly implied. " +
        "Skill levels: beginner = just started or very casual; intermediate = plays regularly; " +
        "advanced = competitive or high proficiency; professional = elite or paid. " +
        "If skill level is not mentioned, infer from context or default to beginner. " +
        "Return an empty array if no recognizable sports are found.",
      responseMimeType: "application/json",
      responseSchema: SPORT_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) return [];

  const parsed = JSON.parse(raw) as { sports: ExtractedSport[] };
  return parsed.sports ?? [];
}

// Detects sports from a profile photo. Accepts a base64-encoded image
// (no data URL prefix) and its MIME type. Returns an empty array on failure.
export async function extractSportsFromPhoto(
  base64: string,
  mimeType: string
): Promise<ExtractedSport[]> {
  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Identify any sports the person in this photo appears to play, " +
              "based only on visible cues (equipment, attire, setting, posture). " +
              "Be conservative — only return sports you are confident about. " +
              "Default skill level to beginner unless equipment/setting clearly suggests otherwise. " +
              "Return an empty array if no sports are visible.",
          },
          { inlineData: { data: base64, mimeType } },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: SPORT_SCHEMA,
    },
  });

  const raw = response.text;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as { sports: ExtractedSport[] };
    return parsed.sports ?? [];
  } catch {
    return [];
  }
}

// Merges sports lists from multiple sources, picking the highest skill level
// when the same sport appears in more than one source.
const SKILL_RANK: Record<SkillLevel, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
  professional: 3,
};

export function mergeSports(...sources: ExtractedSport[][]): ExtractedSport[] {
  const merged = new Map<string, ExtractedSport>();
  for (const list of sources) {
    for (const item of list) {
      const existing = merged.get(item.sport);
      if (!existing || SKILL_RANK[item.skill_level] > SKILL_RANK[existing.skill_level]) {
        merged.set(item.sport, item);
      }
    }
  }
  return Array.from(merged.values());
}
