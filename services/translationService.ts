import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult } from "../types";

export const analyzeHieroglyph = async (croppedImageBase64: string): Promise<TranslationResult> => {
  try {
    // Initialize Gemini Client
    // process.env.API_KEY is automatically injected in this environment
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Clean the base64 string (remove data URL prefix if present)
    const base64Data = croppedImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    // Call Gemini 2.5 Flash
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
            }
          },
          {
            text: `Analyze this image crop containing an Ancient Egyptian Hieroglyph. 
            Identify the symbol and provide the top 5 most likely candidates.
            For each candidate, provide:
            - The symbol name (e.g. Vulture, Water Ripple)
            - Probability (confidence score between 0 and 1)
            - Meaning (what it represents)
            - Gardiner Code (e.g. G1, N35) if applicable
            - A brief historical description.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predictions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  probability: { type: Type.NUMBER },
                  meaning: { type: Type.STRING },
                  gardinerCode: { type: Type.STRING },
                  description: { type: Type.STRING }
                },
                required: ["symbol", "probability", "meaning", "gardinerCode", "description"]
              }
            }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response received from the model.");
    }

    const data = JSON.parse(resultText);

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      croppedImageBase64, // Return the original image to display in the UI
      predictions: data.predictions || []
    };

  } catch (error) {
    console.error("Translation Service Error:", error);
    throw error;
  }
};