'use server';
/**
 * @fileOverview AI flow to generate a book cover image based on title and summary.
 *
 * - generateBookCover - Function to generate a book cover.
 * - GenerateBookCoverInput - Input type for the function.
 * - GenerateBookCoverOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateBookCoverInputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  summary: z.string().describe('A brief summary of the book.'),
  category: z.string().optional().default('Novel').describe('The category of the book (e.g., Novel, Manga, Fantasy).'),
});
export type GenerateBookCoverInput = z.infer<typeof GenerateBookCoverInputSchema>;

const GenerateBookCoverOutputSchema = z.object({
  coverImageDataUri: z.string().describe('The generated cover image as a data URI, or an empty string if generation failed.'),
});
export type GenerateBookCoverOutput = z.infer<typeof GenerateBookCoverOutputSchema>;

export async function generateBookCover(input: GenerateBookCoverInput): Promise<GenerateBookCoverOutput> {
  return generateBookCoverFlow(input);
}

const generateBookCoverFlow = ai.defineFlow(
  {
    name: 'generateBookCoverFlow',
    inputSchema: GenerateBookCoverInputSchema,
    outputSchema: GenerateBookCoverOutputSchema,
  },
  async (input) => {
    try {
      let stylePrompt = "An artistic and abstract book cover. The style should be suitable for a book cover, perhaps minimalist. Focus on the title to inspire the visual theme. Avoid adding any text to the image itself.";
      switch (input.category.toLowerCase()) {
          case 'novel':
              stylePrompt = "A book cover for a novel, with a photorealistic or painterly style. It should feature thematic elements based on the summary, with dramatic lighting. The title of the book should be considered for the main visual theme, but do not write the title on the cover.";
              break;
          case 'manga':
              stylePrompt = "A manga-style book cover, in a vibrant anime art style. The cover should feature characters or scenes inspired by the title and summary. The art should be dynamic and expressive. Do not add any text to the image.";
              break;
          case 'fantasy':
              stylePrompt = "An epic fantasy book cover, with a richly detailed illustration. Think mythical creatures, magical landscapes, or heroic characters, inspired by the title and summary. Do not add any text to the image.";
              break;
          case 'science fiction':
              stylePrompt = "A science fiction book cover, with a futuristic or high-tech aesthetic. It could feature spaceships, planets, robots, or advanced technology, based on the title and summary. Do not add any text to the image.";
              break;
          case 'mystery':
              stylePrompt = "A mystery novel book cover, with a suspenseful and intriguing atmosphere. Use shadows, silhouettes, and subtle clues related to the title and summary. Do not add any text to the image.";
              break;
          case 'non-fiction':
              stylePrompt = "A non-fiction book cover with a clean, modern, and professional design. It should be more abstract or conceptual, using strong typography and graphic elements related to the book's subject. Do not add any text to the image.";
              break;
          default:
              stylePrompt = "An artistic and abstract book cover. The style should be suitable for a book cover, perhaps minimalist. Focus on the title to inspire the visual theme. Avoid adding any text to the image itself.";
              break;
      }

      let promptText = `${stylePrompt} It's for a book titled '${input.title}'.`;
      if (input.summary && input.summary.trim().length > 10) {
        promptText += ` The book is about: '${input.summary}'.`;
      }
      promptText += ` The image should be a vertical rectangle, typical for a book cover. Do not render any text on the image.`;
      
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-preview-image-generation',
        prompt: promptText,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
           safetySettings: [ // Added safety settings to be less restrictive for creative content
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
      });

      if (media?.url) {
        return {coverImageDataUri: media.url};
      } else {
        console.warn('AI model did not return image output for cover generation.');
        return {coverImageDataUri: ""};
      }
    } catch (error) {
      console.error('Error during generateBookCoverFlow:', error);
      return {coverImageDataUri: ""};
    }
  }
);
