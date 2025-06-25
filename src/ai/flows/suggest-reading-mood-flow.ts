'use server';

/**
 * @fileOverview AI flow to suggest a reading mood and soundtrack for a book.
 *
 * - suggestReadingMood - Function to generate the suggestions.
 * - SuggestReadingMoodInput - Input type for the function.
 * - SuggestReadingMoodOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestReadingMoodInputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  summary: z.string().describe('A brief summary of the book.'),
  category: z.string().describe('The category of the book (e.g., Novel, Fantasy, Science Fiction).'),
});
export type SuggestReadingMoodInput = z.infer<typeof SuggestReadingMoodInputSchema>;

const SuggestReadingMoodOutputSchema = z.object({
  moodDescription: z.string().describe("A short, evocative description of the ideal reading atmosphere or mood for the book (e.g., 'A rainy afternoon with a cup of tea.')."),
  soundtrack: z.array(z.string()).describe("A list of 3-5 instrumental music genres (with no lyrics) that would make a good soundtrack for reading this book."),
});
export type SuggestReadingMoodOutput = z.infer<typeof SuggestReadingMoodOutputSchema>;

export async function suggestReadingMood(input: SuggestReadingMoodInput): Promise<SuggestReadingMoodOutput> {
  return suggestReadingMoodFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestReadingMoodPrompt',
  input: {schema: SuggestReadingMoodInputSchema},
  output: {schema: SuggestReadingMoodOutputSchema},
  prompt: `You are a creative librarian with a passion for creating immersive reading experiences. Your task is to suggest a reading mood and a fitting soundtrack for a given book.

Book Details:
- Title: {{{title}}}
- Summary: {{{summary}}}
- Category: {{{category}}}

Instructions:
1.  **Describe the Mood:** Based on the book's details, write a single, short, and atmospheric sentence that describes the perfect setting or mood for reading this book. Be creative and evocative.
2.  **Suggest an Instrumental Soundtrack:** Recommend a list of 3 to 5 instrumental music genres that would complement the book's tone and themes. The music must not contain any words or lyrics. Examples include 'Classical Piano', 'Lofi Beats', 'Ambient Space Music', or 'Cinematic Score'. Do not suggest artists, only genres.

Return ONLY a single, valid JSON object matching the requested schema. Do not add any conversational text or markdown formatting around the JSON.`,
});


const suggestReadingMoodFlow = ai.defineFlow(
  {
    name: 'suggestReadingMoodFlow',
    inputSchema: SuggestReadingMoodInputSchema,
    outputSchema: SuggestReadingMoodOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (output) {
        return output;
      } else {
        console.warn('AI did not return a mood suggestion.');
        return { moodDescription: "Could not generate a mood. Try again!", soundtrack: [] };
      }
    } catch (error) {
      console.error('Error during suggestReadingMoodFlow:', error);
      return { moodDescription: "An error occurred while generating suggestions.", soundtrack: [] };
    }
  }
);
