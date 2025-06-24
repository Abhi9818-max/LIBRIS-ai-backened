'use server';
/**
 * @fileOverview AI flow to generate an image based on a scene description.
 *
 * - generateSceneImage - Function to generate the image.
 * - GenerateSceneImageInput - Input type for the function.
 * - GenerateSceneImageOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSceneImageInputSchema = z.object({
  text: z.string().describe('The text passage describing the scene.'),
});
export type GenerateSceneImageInput = z.infer<typeof GenerateSceneImageInputSchema>;

const GenerateSceneImageOutputSchema = z.object({
  imageDataUri: z.string().describe('The generated image as a data URI, or an empty string if generation failed.'),
});
export type GenerateSceneImageOutput = z.infer<typeof GenerateSceneImageOutputSchema>;

export async function generateSceneImage(input: GenerateSceneImageInput): Promise<GenerateSceneImageOutput> {
  return generateSceneImageFlow(input);
}

const generateSceneImageFlow = ai.defineFlow(
  {
    name: 'generateSceneImageFlow',
    inputSchema: GenerateSceneImageInputSchema,
    outputSchema: GenerateSceneImageOutputSchema,
  },
  async (input) => {
    try {
      const promptText = `Generate a vivid, artistic, and photorealistic image based on the following scene description from a book. The image should be atmospheric and detailed, capturing the mood of the text. Do not include any text, words, or letters in the image itself.

Scene Description:
"${input.text}"`;
      
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: promptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
           safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        },
      });

      if (media?.url) {
        return {imageDataUri: media.url};
      } else {
        console.warn('AI model did not return image output for scene generation.');
        return {imageDataUri: ""};
      }
    } catch (error) {
      console.error('Error during generateSceneImageFlow:', error);
      return {imageDataUri: ""};
    }
  }
);
