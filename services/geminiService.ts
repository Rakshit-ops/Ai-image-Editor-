import { GoogleGenAI, Modality } from "@google/genai";
import { blobToBase64 } from "../utils/fileUtils";

// Initialize AI client without API key for free tier
const ai = new GoogleGenAI(); // Free tier does not require a key

// Define types for image and text parts
interface ImagePart {
    inlineData: {
        data: string; // base64 encoded string
        mimeType: string;
    };
}

interface TextPart {
    text: string;
}

type ContentPart = ImagePart | TextPart;

export const generateImage = async (files: File[], prompt: string): Promise<string> => {
    try {
        const imageParts: Promise<ImagePart>[] = files.map(async (file) => {
            const base64Data = await blobToBase64(file);
            return {
                inlineData: {
                    data: base64Data,
                    mimeType: file.type,
                },
            };
        });

        const resolvedImageParts = await Promise.all(imageParts);

        const textPart: TextPart = { text: prompt };

        const allParts: ContentPart[] = [...resolvedImageParts, textPart];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: allParts,
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        // Extract generated image from response
        const firstCandidate = response.candidates?.[0];
        if (firstCandidate?.content?.parts) {
            for (const part of firstCandidate.content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const mimeType = part.inlineData.mimeType || 'image/png';
                    return `data:${mimeType};base64,${base64ImageBytes}`;
                }
            }
        }

        const finishReason = firstCandidate?.finishReason;
        if (finishReason && finishReason !== 'STOP') {
            throw new Error(`Image generation failed. Reason: ${finishReason}. This is often due to safety filters or an invalid request.`);
        }

        throw new Error("No image was generated in the response. The response may have been empty or blocked.");

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        if (error instanceof Error) {
            throw new Error(`Gemini API error: ${error.message}`);
        }
        throw new Error("An unexpected error occurred while generating the image.");
    }
};
