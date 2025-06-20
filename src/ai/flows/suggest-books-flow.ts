
'use server';
/**
 * @fileOverview AI flow to suggest books based on user query.
 *
 * - suggestBooks - Function to get book suggestions.
 * - SuggestBooksInput - Input type for the function.
 * - SuggestBooksOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BookSuggestionSchema = z.object({
  title: z.string().describe('The title of the suggested book.'),
  author: z.string().describe('The author of the suggested book.'),
  reason: z.string().describe('A brief reason why this book is recommended based on the user query.'),
});

const SuggestBooksInputSchema = z.object({
  query: z.string().describe('The user query describing the type of book they want to read (e.g., genre, themes, mood).'),
});
export type SuggestBooksInput = z.infer<typeof SuggestBooksInputSchema>;

const SuggestBooksOutputSchema = z.object({
  suggestions: z.array(BookSuggestionSchema).describe('A list of 3 to 5 book suggestions.'),
});
export type SuggestBooksOutput = z.infer<typeof SuggestBooksOutputSchema>;

export async function suggestBooks(input: SuggestBooksInput): Promise<SuggestBooksOutput> {
  return suggestBooksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBooksPrompt',
  input: {schema: SuggestBooksInputSchema},
  output: {schema: SuggestBooksOutputSchema},
  prompt: `You are a helpful and knowledgeable librarian AI. A user is looking for book recommendations.
Based on their query: "{{query}}", please suggest 3 to 5 books.
For each book, provide the title, the author, and a brief reason (1-2 sentences) why it's a good recommendation based on their query.
Ensure your response is in the structured JSON format as requested by the output schema.
If the query is too vague or un-cooperative, try to provide some general popular suggestions or ask for clarification within the reason for a generic suggestion.
`,
});

const defaultOutput: SuggestBooksOutput = {
  suggestions: [],
};

const suggestBooksFlow = ai.defineFlow(
  {
    name: 'suggestBooksFlow',
    inputSchema: SuggestBooksInputSchema,
    outputSchema: SuggestBooksOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (output && output.suggestions) {
        return output;
      } else {
        console.warn('AI model did not return expected output for book suggestions. Returning empty list.');
        // Potentially return a default suggestion or error indicator
        return { suggestions: [{ title: "No suggestions available", author: "AI Assistant", reason: "The AI could not generate suggestions for your query at this time. Please try rephrasing or be more specific."}] };
      }
    } catch (error) {
      console.error('Error during suggestBooksFlow:', error);
      return { suggestions: [{ title: "Error", author: "System", reason: "An error occurred while trying to get book suggestions. Please try again later."}] };
    }
  }
);
