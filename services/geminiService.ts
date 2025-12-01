
import { GoogleGenAI } from "@google/genai";
import { EditResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Sends one or more images and a prompt to the Gemini 2.5 Flash Image model for editing.
 */
export const editImageWithGemini = async (
  imageData: { base64Data: string; mimeType: string }[], // Array of image data
  prompt: string
): Promise<EditResponse> => {
  try {
    if (imageData.length === 0) {
      return { success: false, error: "No image data provided for editing." };
    }

    // Prepare image parts, cleaning base64 strings
    const imageParts = imageData.map(img => ({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64Data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, ""),
      },
    }));

    // Construct the contents array with the text prompt and all image parts
    // Placing the text prompt first generally works well for intent.
    const allContentsParts = [{ text: prompt }, ...imageParts];

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Mapped from "nano banana"
      contents: { parts: allContentsParts },
      // Config ensures we get an image back if possible, though defaults usually work well for editing
    });

    // Parse the response to find the generated image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
      return { success: false, error: "No response candidates from Gemini." };
    }

    const parts = candidates[0].content.parts;
    let generatedImageBase64 = null;

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        generatedImageBase64 = part.inlineData.data;
        // The API returns raw base64, we need to prefix it for display
        const returnedMime = part.inlineData.mimeType || 'image/png';
        generatedImageBase64 = `data:${returnedMime};base64,${generatedImageBase64}`;
        break; 
      }
    }

    if (generatedImageBase64) {
      return { success: true, image: generatedImageBase64 };
    } else {
      // If no image found, maybe it returned text explaining why
      const textPart = parts.find(p => p.text);
      return { 
        success: false, 
        error: textPart?.text || "The model processed the request but did not return an image. Try rephrasing your prompt or ensure the request is valid for the provided images." 
      };
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return { 
      success: false, 
      error: error.message || "An unexpected error occurred while communicating with Gemini." 
    };
  }
};
