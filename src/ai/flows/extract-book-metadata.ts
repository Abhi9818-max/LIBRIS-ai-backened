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
      'The entire text content of a book.'
    ),
});
export type ExtractBookMetadataInput = z.infer<typeof ExtractBookMetadataInputSchema>;

const ExtractBookMetadataOutputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().describe('The author of the book.'),
  summary: z.string().describe('A brief summary of the book.'),
  category: z.string().describe('The most likely category of the book (e.g., Novel, Fantasy, Science Fiction).'),
});
export type ExtractBookMetadataOutput = z.infer<typeof ExtractBookMetadataOutputSchema>;

export async function extractBookMetadata(input: ExtractBookMetadataInput): Promise<ExtractBookMetadataOutput> {
  return extractBookMetadataFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractBookMetadataPrompt',
  input: {schema: ExtractBookMetadataInputSchema},
  output: {schema: ExtractBookMetadataOutputSchema},
  prompt: `You are an ultimate smart literary analysis AI. You have been provided with the complete text of a book. Your mission is to perform a deep analysis and extract the following information with the highest accuracy.

Instructions:
1.  **Identify Title and Author:** Meticulously scan the initial pages of the text to pinpoint the book's exact title and author. This information is crucial.
2.  **Craft the Ultimate Summary:** This is the most important task. Read and comprehend the *entire* provided text. Do not just look at the first few pages. Synthesize a detailed, insightful, and comprehensive summary that captures the main plot, character arcs, underlying themes, and overall tone of the book. Go beyond a simple blurb; provide a summary that demonstrates a true understanding of the work.
3.  **Determine the Precise Category:** Based on your full reading of the text, classify the book into the single most fitting category: Novel, Fantasy, Science Fiction, Mystery, Manga, Non-Fiction, or Other.

Return ONLY a single, valid JSON object that strictly adheres to the requested schema. Do not add any extra commentary or markdown.

Full Book Text to Analyze:
{{{textContent}}}`,
});

const defaultMetadata: ExtractBookMetadataOutput = {
  title: "",
  author: "",
  summary: "",
  category: "Novel",
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
      // Manually verify and construct the output to guarantee a valid object.
      // This prevents crashes if the AI returns a partial or incomplete response.
      if (output) {
        return {
          title: output.title || '',
          author: output.author || '',
          summary: output.summary || '',
          category: output.category || 'Novel', // Guarantee a category is always present.
        };
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
