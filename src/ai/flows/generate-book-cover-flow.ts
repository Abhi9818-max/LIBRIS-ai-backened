
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
  category: z.string().optional().describe('The category of the book (e.g., Novel, Manga, Fantasy).'),
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
      const category = input.category || 'Novel'; // Handle default category internally
      let stylePrompt: string;
      
      switch (category.toLowerCase()) {
          case 'novel':
              stylePrompt = "A book cover for a novel, with a photorealistic or painterly style. It should feature thematic elements based on the summary, with dramatic lighting. The title of the book should be considered for the main visual theme.";
              break;
          case 'manga':
              stylePrompt = "A manga-style book cover, in a vibrant anime art style. The cover should feature characters or scenes inspired by the title and summary. The art should be dynamic and expressive.";
              break;
          case 'fantasy':
              stylePrompt = "An epic fantasy book cover, with a richly detailed illustration. Think mythical creatures, magical landscapes, or heroic characters, inspired by the title and summary.";
              break;
          case 'science fiction':
              stylePrompt = "A science fiction book cover, with a futuristic or high-tech aesthetic. It could feature spaceships, planets, robots, or advanced technology, based on the title and summary.";
              break;
          case 'mystery':
              stylePrompt = "A mystery novel book cover, with a suspenseful and intriguing atmosphere. Use shadows, silhouettes, and subtle clues related to the title and summary.";
              break;
          case 'non-fiction':
              stylePrompt = "A non-fiction book cover with a clean, modern, and professional design. It should be more abstract or conceptual, using strong typography and graphic elements related to the book's subject.";
              break;
          default:
              stylePrompt = `A book cover in the style of ${category}. The image should be visually inspired by the book's title and summary, capturing the essence of a "${category}" genre book.`;
              break;
      }

      const summaryForPrompt = (input.summary && input.summary.trim().length > 10) ? input.summary : `A book titled '${input.title}' with a genre of '${category}'.`;
      const promptText = `Generate a high-resolution, professional book cover image. The image must be purely visual and contain absolutely no text, letters, or numbers. The style should be: ${stylePrompt}. It is for a book titled '${input.title}'. The story is about: '${summaryForPrompt}'. The final image must be a vertical rectangle suitable for a book cover.`;
      
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
