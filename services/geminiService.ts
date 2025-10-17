import { GoogleGenAI, Modality } from "@google/genai";
import { blobToBase64 } from "../utils/fileUtils";

if (!process.env.API_KEY) {
    // This is a placeholder check. The build environment will inject the API key.
    // In a real scenario, you would have more robust error handling or a server-side proxy.
    console.warn("API_KEY environment variable not set. API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

// Define the type for an image part
interface ImagePart {
    inlineData: {
        data: string; // base64 encoded string
        mimeType: string;
    };
}

// Define the type for a text part
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

        // Fix: For image editing, it's conventional to place image parts before the text prompt.
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
        
        // Extract the generated image from the response
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

        // If no image is found, provide a more detailed error based on finishReason
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