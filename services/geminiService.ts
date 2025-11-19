import { GoogleGenAI } from "@google/genai";
import { AdminQuestionStats } from "../types";

// NOTE: The API key must be obtained exclusively from the environment variable process.env.API_KEY.
// It is injected automatically, so you do not need to modify the API key code.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateAdminInsights = async (stats: AdminQuestionStats[]): Promise<string> => {
  // Filter for questions with errors
  const problemQuestions = stats.filter(s => s.errorCount > 0);

  if (problemQuestions.length === 0) {
    return "No significant errors detected yet. Great job to the students!";
  }

  const promptData = problemQuestions.map(q => ({
    question: q.questionText,
    area: q.area,
    errorRate: `${((q.errorCount / q.totalAttempts) * 100).toFixed(1)}%`,
  }));

  const prompt = `
    You are a senior English teacher analyzing student quiz performance.
    Here is a list of questions where students made the most mistakes:
    
    ${JSON.stringify(promptData, null, 2)}
    
    Please provide a concise, encouraging summary for the teacher. 
    1. Identify the common grammatical or vocabulary theme causing issues.
    2. Suggest one teaching tip to help students improve in these specific areas.
    3. Keep the tone professional but insightful.
    4. Output in Markdown format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate insights.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to AI service for insights. Please check API key configuration.";
  }
};