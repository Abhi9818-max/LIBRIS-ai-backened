
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
  category: z.string().optional().describe('The category of the book (e.g., Novel, Manga, Fantasy).'),
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
      const category = input.category || 'Novel'; // Default to Novel
      let stylePrompt: string;

      switch (category.toLowerCase()) {
          case 'novel':
              stylePrompt = "A photorealistic or painterly style image, capturing the environment and characters like a scene from a film. It should be atmospheric and detailed.";
              break;
          case 'manga':
              stylePrompt = "A vibrant anime or manga style illustration of the scene. The art should be dynamic and expressive, focusing on characters and action.";
              break;
          case 'fantasy':
              stylePrompt = "An epic fantasy illustration. The scene should be rich with detail, featuring mythical elements, magical lighting, or heroic characters as described.";
              break;
          case 'science fiction':
              stylePrompt = "A science fiction scene with a futuristic or high-tech aesthetic. It could feature advanced technology, alien landscapes, or spacecraft, based on the description.";
              break;
          case 'mystery':
              stylePrompt = "A suspenseful and intriguing image with a noir or mystery atmosphere. Use shadows, dramatic lighting, and subtle clues to capture the mood.";
              break;
          case 'non-fiction':
               stylePrompt = "A clean, modern, and informative illustration or diagram that visually represents the concept described in the text.";
              break;
          default:
              stylePrompt = `An image in the style of ${category}. The image should be atmospheric and detailed, capturing the mood of the text as if it were from a book of the "${category}" genre.`;
              break;
      }
      
      const promptText = `Generate a single, high-resolution image based on the following scene description from a book. Style: ${stylePrompt}. The image must be purely visual and must not contain any text, letters, or numbers. Focus on creating a cinematic, atmospheric visual representation. The final image should have a professional, polished quality.

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
