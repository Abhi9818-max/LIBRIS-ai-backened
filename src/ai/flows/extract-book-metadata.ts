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
  prompt: `You are an expert librarian AI specializing in analyzing book manuscripts. Your task is to meticulously extract key metadata from the provided text, which represents the first few pages of a book. Even if the text is very sparse (e.g., only a title page), do your best to identify a plausible title and author.

Follow these instructions carefully:
1.  **Identify the Title:** Scan the text for the most prominent text. This is often the largest, most centered text, or written in all capital letters. This is almost always the book's title. Be precise and capture the full title. If no clear title is present, use your best judgment to identify what is most likely the title.
2.  **Identify the Author:** The author's name is typically located just below the title, often preceded by "by" or "written by". If no such phrase is present, look for a name that appears to be a person's name near the title. Extract the full name.
3.  **Generate a Compelling Summary:** Read all the provided text. Synthesize a concise, one-paragraph summary that would entice someone to read the book. If the text is too sparse (e.g., only a title page), use the title and author to infer the genre and create a plausible and engaging summary based on that inference.
4.  **Determine the Category:** Based on all the information you have gathered (title, author, summary), classify the book into ONE of the following categories: Novel, Fantasy, Science Fiction, Mystery, Manga, Non-Fiction, Other. Choose the most fitting category.

Return ONLY a single, valid JSON object matching the requested schema. Do not add any conversational text or markdown formatting around the JSON. Prioritize finding a title and author above all else.

Text to Analyze:
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
