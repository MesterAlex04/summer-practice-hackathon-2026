import { GoogleGenAI, Type } from "@google/genai";
import { SPORT_OPTIONS, type SkillLevel } from "@/lib/sports";

export const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ExtractedSport = { sport: string; skill_level: SkillLevel };

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
      responseSchema: {
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
      },
    },
  });

  const raw = response.text;
  if (!raw) return [];

  const parsed = JSON.parse(raw) as { sports: ExtractedSport[] };
  return parsed.sports ?? [];
}
