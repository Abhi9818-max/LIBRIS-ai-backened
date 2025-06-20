
'use server';
/**
 * @fileOverview AI flow to suggest books based on user query or answer general book-related questions.
 *
 * - suggestBooks - Function to get book suggestions or answers.
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
  query: z.string().describe('The user query, which could be a request for book recommendations or a general question about books, authors, genres, etc.'),
});
export type SuggestBooksInput = z.infer<typeof SuggestBooksInputSchema>;

const SuggestBooksOutputSchema = z.object({
  textResponse: z.string().optional().describe('A general text response from the AI if not providing specific book suggestions.'),
  suggestions: z.array(BookSuggestionSchema).optional().describe('A list of 3 to 5 book suggestions, if applicable.'),
});
export type SuggestBooksOutput = z.infer<typeof SuggestBooksOutputSchema>;

export async function suggestBooks(input: SuggestBooksInput): Promise<SuggestBooksOutput> {
  return suggestBooksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBooksPrompt',
  input: {schema: SuggestBooksInputSchema},
  output: {schema: SuggestBooksOutputSchema},
  prompt: `You are a knowledgeable and helpful AI Librarian and Book Expert. Engage in a friendly conversation with the user about books, authors, genres, literary themes, or any related topic.

User's query: "{{query}}"

Your task is to:
1.  Analyze the user's query.
2.  If the query clearly asks for book recommendations (e.g., "suggest books about...", "I'm looking for...", "recommend me...", "find books like..."), provide 3 to 5 book suggestions. For each book, include the title, the author, and a brief reason (1-2 sentences) why it's a good recommendation. Populate the 'suggestions' field in the JSON output.
3.  If the user asks a general question (e.g., "Tell me about Ernest Hemingway", "What are common themes in dystopian fiction?", "What was your last suggestion about?", "Who wrote 'To Kill a Mockingbird'?"), provide a helpful and informative text response. Populate the 'textResponse' field in the JSON output.
4.  If the query is ambiguous, you can ask for clarification or offer a relevant general response in the 'textResponse' field.
5.  Prioritize providing a direct text answer in 'textResponse' if the query is a question not explicitly asking for recommendations.
6.  Only use the 'suggestions' output structure when you are providing a list of book recommendations. Otherwise, use the 'textResponse' output field. Do not populate both unless absolutely necessary and contextually makes sense (which is rare). If providing suggestions, do not also provide a generic textResponse like "Here are some suggestions". Let the suggestions speak for themselves.

Ensure your response is in the structured JSON format as requested by the output schema.
`,
});

const defaultOutput: SuggestBooksOutput = {
  textResponse: "I'm sorry, I couldn't process that request. Please try again or rephrase your query.",
  suggestions: [],
};

const suggestBooksFlow = ai.defineFlow(
  {
    name: 'suggestBooksFlow',
    inputSchema: SuggestBooksInputSchema,
    outputSchema: SuggestBooksOutputSchema,
  },
  async (input): Promise<SuggestBooksOutput> => {
    try {
      const {output} = await prompt(input);
      
      // Ensure we always return an object that conforms to SuggestBooksOutputSchema
      if (output) {
        // If only suggestions are provided, make sure textResponse is undefined
        if (output.suggestions && output.suggestions.length > 0 && !output.textResponse) {
            return { suggestions: output.suggestions };
        }
        // If only textResponse is provided
        if (output.textResponse && (!output.suggestions || output.suggestions.length === 0)) {
            return { textResponse: output.textResponse };
        }
        // If both are somehow provided (though prompt discourages this), return both
        if (output.textResponse && output.suggestions && output.suggestions.length > 0) {
            return output;
        }
         // If output is an empty object or doesn't match expected fields.
        if (Object.keys(output).length === 0) {
           console.warn('AI model returned an empty object. Falling back to default error.');
           return { textResponse: "I received an unexpected response. Could you try rephrasing?" };
        }
        // If neither is populated but output exists (e.g. an empty object from model)
        return output; // Or a more specific default like the one below
      } else {
        console.warn('AI model did not return any output for book suggestions/query. Returning default error.');
        return { textResponse: "I'm sorry, I wasn't able to generate a response for that. Please try again." };
      }
    } catch (error: any) {
      console.error('Error during suggestBooksFlow:', error);
      let errorMessage = "An error occurred while trying to process your request. Please try again later.";
      if (error.message) {
        errorMessage = `An error occurred: ${error.message}. Please try again.`
      }
      return { textResponse: errorMessage };
    }
  }
);
