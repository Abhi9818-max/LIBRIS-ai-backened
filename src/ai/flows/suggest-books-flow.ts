
'use server';
/**
 * @fileOverview AI flow to suggest books based on user query or answer general book-related questions, maintaining conversation context.
 *
 * - suggestBooks - Function to get book suggestions or answers.
 * - SuggestBooksInput - Input type for the function.
 * - SuggestBooksOutput - Output type for thefunction.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const BookSuggestionSchema = z.object({
  title: z.string().describe('The title of the suggested book.'),
  author: z.string().describe('The author of the suggested book.'),
  reason: z.string().describe('A compelling and specific reason (2-3 sentences) why this book is recommended, directly related to the user\'s query and conversation history. Avoid generic reasons; explain the book\'s relevance clearly. Do not use placeholders like "[Reason relevant to query/history]" if the information is not known; instead, provide the best possible reason based on available knowledge or omit the suggestion if a good reason cannot be formulated.'),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']).describe("The role of the message sender, either 'user' or 'model' (for AI)."),
  content: z.string().describe("The text content of the message."),
});

const SuggestBooksInputSchema = z.object({
  currentQuery: z.string().describe("The user's current query or message in the conversation."),
  history: z.array(ChatMessageSchema).optional().describe('The conversation history up to this point, ordered from oldest to newest.'),
});
export type SuggestBooksInput = z.infer<typeof SuggestBooksInputSchema>;

const SuggestBooksOutputSchema = z.object({
  textResponse: z.string().optional().describe('A general text response from the AI if not providing specific book suggestions.'),
  suggestions: z.array(BookSuggestionSchema).optional().describe('A list of 3 to 5 thoughtful and diverse book suggestions, if applicable.'),
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
Pay close attention to the conversation history to understand the context of the user's current query. Your knowledge is based on information available up to your last training update (early 2023).

{{#if history.length}}
Conversation History (oldest to newest):
{{#each history}}
{{this.role}}: {{this.content}}
---
{{/each}}
{{else}}
This is the beginning of the conversation.
{{/if}}

Current User Query: "{{currentQuery}}"

Your task is to:
1.  Analyze the user's current query in the context of the conversation history.
2.  If the query clearly asks for book recommendations (e.g., "suggest books about...", "I'm looking for...", "recommend me...", "find books like..."), provide 3 to 5 thoughtful and diverse book suggestions. For each book, include the title, the author, and a compelling and specific reason (2-3 sentences) why it's a good recommendation *directly related to the user's query and conversation history*. Avoid generic reasons; explain the book's relevance clearly. Do not use placeholders like "[Reason]" if specific details are unknown; offer the best justification possible with your existing knowledge or omit the suggestion if a strong, relevant reason cannot be formed. Populate the 'suggestions' field in the JSON output. If the user's query is specific, try to match that specificity. If it's broad, offer a range that touches on different aspects of their interest.
3.  If the user asks a general question (e.g., "Tell me about Ernest Hemingway", "Why was 'To Kill a Mockingbird' banned?", "What are common themes in dystopian fiction?", "What was your last suggestion about?"), provide a helpful and informative text response. Populate the 'textResponse' field in the JSON output. Use the conversation history to understand follow-up questions.
4.  If the query is ambiguous, you can ask for clarification or offer a relevant general response in the 'textResponse' field.
5.  Prioritize providing a direct text answer in 'textResponse' if the query is a question not explicitly asking for recommendations.
6.  Only use the 'suggestions' output structure when you are providing a list of book recommendations. Otherwise, use the 'textResponse' output field. Do not populate both unless absolutely necessary and contextually makes sense (which is rare). If providing suggestions, do not also provide a generic textResponse like "Here are some suggestions". Let the suggestions speak for themselves.
7.  If the query seems to require very recent information (e.g., events or publications from the last few months/year beyond early 2023), clearly state that your knowledge is based on information available up to your last training update and you cannot access live, real-time internet data for the very latest updates. You can still offer information based on what you know up to that point.

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
      // Filter out any history items with empty content, just in case
      const filteredHistory = input.history?.filter(item => item.content && item.content.trim() !== "") || [];
      const promptInput = { ...input, history: filteredHistory };

      const {output} = await prompt(promptInput);
      
      if (output) {
        if (output.suggestions && output.suggestions.length > 0 && !output.textResponse) {
            return { suggestions: output.suggestions };
        }
        if (output.textResponse && (!output.suggestions || output.suggestions.length === 0)) {
            return { textResponse: output.textResponse };
        }
        if (output.textResponse && output.suggestions && output.suggestions.length > 0) {
            return output;
        }
        // If the output is an empty object but valid, it might be an intentional empty response
        // for cases where AI has nothing to add or suggest based on the prompt logic.
        // However, if the query implies a need for an answer, this should be handled.
        // For now, let's assume an empty object for a specific query might mean "no specific suggestions/text found useful".
        // A more robust handling might involve the prompt schema forcing either textResponse or suggestions.
        if (Object.keys(output).length === 0) {
           console.warn('AI model returned an empty object. This might be intentional or an issue.');
           // Returning a generic message if it seems like a fallback is needed.
           // Consider if the prompt should always guide towards one field or the other.
           return { textResponse: "I processed your request, but I don't have a specific suggestion or direct answer for that particular query right now." };
        }
        return output; 
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
      // Check for specific error types if needed, e.g., rate limits, auth errors
      // if (error.message && error.message.includes("API key not valid")) {
      //   errorMessage = "There's an issue with the AI service configuration. Please contact support.";
      // }
      return { textResponse: errorMessage };
    }
  }
);

