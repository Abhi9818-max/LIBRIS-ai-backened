
'use server';

/**
 * @fileOverview AI flow to extract book metadata (title, author, summary) from a PDF.
 *
 * - extractBookMetadata - Function to extract book metadata.
 * - ExtractBookMetadataInput - Input type for the function.
 * - ExtractBookMetadataOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractBookMetadataInputSchema = z.object({
  pdfDataUri: z
    .string()
    .describe(
      'The book PDF content as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.'
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
  prompt: `You are an AI assistant that extracts metadata from book PDFs.

  Analyze the following PDF content and extract the title, author, and a brief summary.
  Return the information in JSON format.

  PDF Content: {{media url=pdfDataUri}}`,
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
