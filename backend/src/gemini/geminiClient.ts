import { GoogleGenerativeAI } from "@google/generative-ai";
import { config } from "../config/index.js";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);

export const generateWithGemini = async (prompt: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error("API returned an empty response.");
    }

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error("❌ Failed to parse JSON from API response:", jsonString);
      throw new Error("API did not return a valid JSON format.");
    }
  } catch (err: any) {
    console.error("❌ An error occurred with the Gemini API:", err.message);

    throw new Error("Failed to generate content from Gemini API.");
  }
};
