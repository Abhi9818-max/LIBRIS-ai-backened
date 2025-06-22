
'use server';

/**
 * @fileOverview AI flow to extract book metadata (title, author, summary) from text content.
 *
 * - extractBookMetadata - Function to extract book metadata.
 * - ExtractBookMetadataInput - Input type for the function.
 * - ExtractBookMetadataOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBookMetadataInputSchema = z.object({
  textContent: z
    .string()
    .describe(
      'The text content from the first few pages of the book PDF.'
    ),
});
export type ExtractBookMetadataInput = z.infer<typeof ExtractBookMetadataInputSchema>;

const ExtractBookMetadataOutputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().describe('The author of the book.'),
  summary: z.string().describe('A brief summary of the book.'),
});
export type ExtractBookMetadataOutput = z.infer<typeof ExtractBookMetadataOutputSchema>;

export async function extractBookMetadata(input: ExtractBookMetadataInput): Promise<ExtractBookMetadataOutput> {
  return extractBookMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBookMetadataPrompt',
  input: {schema: ExtractBookMetadataInputSchema},
  output: {schema: ExtractBookMetadataOutputSchema},
  prompt: `You are an AI assistant that extracts metadata from the text of a book.

  Analyze the following text, which is from the first few pages of a book, and extract the title, author, and a brief summary of the entire book based on this initial text.
  Return the information in JSON format.

  Text Content: {{{textContent}}}`,
});

const defaultMetadata: ExtractBookMetadataOutput = {
  title: "",
  author: "",
  summary: "",
};

const extractBookMetadataFlow = ai.defineFlow(
  {
    name: 'extractBookMetadataFlow',
    inputSchema: ExtractBookMetadataInputSchema,
    outputSchema: ExtractBookMetadataOutputSchema,
  },
  async (input): Promise<ExtractBookMetadataOutput> => {
    try {
      const {output} = await prompt(input);
      if (output) {
        return output;
      } else {
        console.warn('AI model did not return output for metadata extraction. Returning default values.');
        return defaultMetadata;
      }
    } catch (error) {
      console.error('Error during extractBookMetadataFlow:', error);
      // Return default values to ensure the flow completes successfully for Next.js
      return defaultMetadata;
    }
  }
);
