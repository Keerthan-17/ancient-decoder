import { GoogleGenAI, Type } from "@google/genai";
import { TranslationResult, Prediction } from "../types";

const BACKEND_URL = 'http://localhost:8000';
const MIN_CONFIDENCE_THRESHOLD = 0.1; // Minimum confidence to use backend results

/**
 * Enriches backend predictions with Gemini to get symbol names, meanings, and descriptions
 */
async function enrichWithGemini(
  gardinerCodes: Array<{ gardiner_code: string; confidence: number }>,
  imageBase64: string
): Promise<Prediction[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  // Create a prompt with the Gardiner codes from backend
  const gardinerCodesList = gardinerCodes.map((p, i) => 
    `${i + 1}. ${p.gardiner_code} (confidence: ${(p.confidence * 100).toFixed(1)}%)`
  ).join('\n');
  
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
          text: `This image contains an Ancient Egyptian Hieroglyph. 
          The trained model has identified the following Gardiner codes with their confidence scores:
          ${gardinerCodesList}
          
          Please provide detailed information for EACH of these Gardiner codes in the EXACT same order listed above. For each code, provide:
          - The symbol name (e.g. Vulture, Water Ripple, Ankh)
          - Meaning (what it represents in ancient Egyptian)
          - A brief historical description
          - Use the EXACT Gardiner code provided (e.g. ${gardinerCodes[0]?.gardiner_code})
          - Use the confidence score provided for that specific code
          
          Return exactly ${gardinerCodes.length} predictions, one for each Gardiner code in the order listed.`
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
    throw new Error("No response received from Gemini.");
  }

  const data = JSON.parse(resultText);
  const geminiPredictions = data.predictions || [];
  
  // Map Gemini results to backend predictions, ensuring we use backend confidence scores
  return gardinerCodes.map((backendPred, idx) => {
    const geminiPred = geminiPredictions[idx] || geminiPredictions.find(
      (p: Prediction) => p.gardinerCode === backendPred.gardiner_code
    ) || geminiPredictions[0];
    
    return {
      symbol: geminiPred?.symbol || backendPred.gardiner_code,
      probability: backendPred.confidence, // Use backend confidence
      meaning: geminiPred?.meaning || "Unknown meaning",
      gardinerCode: backendPred.gardiner_code,
      description: geminiPred?.description || "No description available"
    };
  });
}

/**
 * Full Gemini analysis (fallback when backend fails)
 */
async function analyzeWithGemini(croppedImageBase64: string): Promise<Prediction[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = croppedImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

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
  return data.predictions || [];
}

/**
 * Main analysis function: Tries backend first, falls back to Gemini if needed
 */
export const analyzeHieroglyph = async (croppedImageBase64: string): Promise<TranslationResult> => {
  try {
    // Step 1: Try backend first
    let backendSuccess = false;
    let backendPredictions: Array<{ gardiner_code: string; confidence: number }> = [];
    let maxConfidence = 0;

    try {
      const base64Data = croppedImageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const backendResponse = await fetch(`${BACKEND_URL}/predict-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: croppedImageBase64 }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (backendResponse.ok) {
        const backendData = await backendResponse.json();
        
        if (backendData.success && backendData.prediction) {
          backendSuccess = true;
          const prediction = backendData.prediction;
          maxConfidence = prediction.confidence || 0;
          backendPredictions = prediction.top_5 || [];
          
          console.log(`Backend prediction successful. Top confidence: ${(maxConfidence * 100).toFixed(1)}%`);
        }
      }
    } catch (backendError) {
      console.warn("Backend request failed, falling back to Gemini:", backendError);
      backendSuccess = false;
    }

    // Step 2: Decide whether to use backend results or fallback to Gemini
    let predictions: Prediction[];

    if (backendSuccess && maxConfidence >= MIN_CONFIDENCE_THRESHOLD && backendPredictions.length > 0) {
      // Backend succeeded with reasonable confidence - enrich with Gemini
      console.log("Enriching backend predictions with Gemini...");
      try {
        predictions = await enrichWithGemini(backendPredictions, croppedImageBase64);
        // Ensure we maintain the confidence scores from backend
        predictions = predictions.map((pred, idx) => ({
          ...pred,
          probability: backendPredictions[idx]?.confidence || pred.probability,
          gardinerCode: backendPredictions[idx]?.gardiner_code || pred.gardinerCode,
        }));
      } catch (enrichError) {
        console.warn("Failed to enrich with Gemini, using full Gemini analysis:", enrichError);
        predictions = await analyzeWithGemini(croppedImageBase64);
      }
    } else {
      // Backend failed or confidence too low - use Gemini fully
      console.log("Using Gemini for full analysis (backend unavailable or low confidence)");
      predictions = await analyzeWithGemini(croppedImageBase64);
    }

    return {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      croppedImageBase64,
      predictions: predictions || []
    };

  } catch (error) {
    console.error("Translation Service Error:", error);
    throw error;
  }
};