import { GoogleGenAI, Modality } from "@google/genai";
import { blobToBase64 } from "../utils/fileUtils";

// Free tier: do NOT use API_KEY
const ai = new GoogleGenAI(); // <- no apiKey

interface ImagePart {
    inlineData: { data: string; mimeType: string; };
}

interface TextPart { text: string; }
type ContentPart = ImagePart | TextPart;

export const generateImage = async (files: File[], prompt: string): Promise<string> => {
    try {
        const imageParts: Promise<ImagePart>[] = files.map(async (file) => ({
            inlineData: { data: await blobToBase64(file), mimeType: file.type }
        }));

        const resolvedImageParts = await Promise.all(imageParts);
        const textPart: TextPart = { text: prompt };
        const allParts: ContentPart[] = [...resolvedImageParts, textPart];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: allParts },
            config: { responseModalities: [Modality.IMAGE] }
        });

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

        throw new Error("No image generated.");
    } catch (err) {
        console.error(err);
        throw new Error("Gemini API error: " + (err instanceof Error ? err.message : String(err)));
    }
};
