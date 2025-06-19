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
      // Construct a prompt that encourages an abstract or artistic cover
      // and guides the model if the summary is short.
      let promptText = `Generate a visually appealing, artistic book cover for a book titled '${input.title}'.`;
      if (input.summary && input.summary.trim().length > 10) {
        promptText += ` The book is about: '${input.summary}'.`;
      } else {
        promptText += ` Focus primarily on the title to inspire the visual theme.`;
      }
      promptText += ` The style should be suitable for a book cover, perhaps abstract or minimalist. Avoid adding any text to the image itself unless it is part of an abstract design element. The image should be a vertical rectangle, typical for a book cover.`;
      
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.0-flash-exp',
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
