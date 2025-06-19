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
      'The book PDF content as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' // Corrected typo here
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

const extractBookMetadataFlow = ai.defineFlow(
  {
    name: 'extractBookMetadataFlow',
    inputSchema: ExtractBookMetadataInputSchema,
    outputSchema: ExtractBookMetadataOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
