
'use server';
/**
 * @fileOverview AI flow to suggest books based on user query or answer general book-related questions,
 * maintaining conversation context.
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
  // Model will default to what's configured in src/ai/genkit.ts (googleai/gemini-1.5-flash-latest)
  prompt: `You are a knowledgeable and helpful AI Librarian and Book Expert.
Your training data has a cutoff (generally early 2023), so you might not know about very recent releases or news.

**Conversation Context and History**
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

**Your Task (Analyze user query and respond thoughtfully):**

1.  **Analyze Query in Context**: Meticulously analyze the user's current query within the ENTIRE conversation history.

2.  **Answering and Recommending**:
    *   **Follow-up Questions**: If the user asks a follow-up question (e.g., "Tell me more about [book from history]", "Why was [book from history] banned?", "What was your last suggestion about?"), your **absolute priority** is to answer that question directly and comprehensively using your knowledge and the conversation history. Use the 'textResponse' field. You MUST reference the specific books or topics from the history in your answer.
    *   **Book Recommendations**: If the query clearly asks for book recommendations:
        *   Provide 3 to 5 thoughtful and diverse suggestions.
        *   For each book, include title, author, and a compelling, specific reason (2-3 sentences) directly related to the user's query/history.
        *   Populate the 'suggestions' field.
    *   **General Questions/Information Synthesis**: For other questions, provide a helpful, informative text response. Synthesize information from your training data.

3.  **Handling Information Gaps**:
    *   If the query asks about topics you believe are beyond your training data cutoff, clearly state your knowledge cutoff. Do not invent information. For example, say: "My knowledge is current up to early 2023, so I may not have information on very recent releases. Based on what I know..."

4.  **Output Format**:
    *   Only use the 'suggestions' field when providing NEW book recommendations.
    *   Use 'textResponse' for all other answers (general info, follow-ups, explanations).
    *   You can populate both 'suggestions' and 'textResponse' if, for example, you provide a general answer and then offer related book suggestions.

Ensure your response is in the structured JSON format as requested by the output schema. Be thoughtful, detailed, and clear.
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
      const filteredHistory = input.history?.filter(item => item.content && item.content.trim() !== "") || [];
      const promptInput = { ...input, history: filteredHistory };

      const {output} = await prompt(promptInput);
      
      if (output) {
        const finalOutput: SuggestBooksOutput = {};

        if (output.suggestions && output.suggestions.length > 0) {
            finalOutput.suggestions = output.suggestions;
        }
        if (output.textResponse) {
            finalOutput.textResponse = output.textResponse;
        }
        
        if (!finalOutput.textResponse && (!finalOutput.suggestions || finalOutput.suggestions.length === 0)) {
           console.warn('AI model returned an empty or insufficient object.');
           finalOutput.textResponse = "I processed your request, but I don't have a specific suggestion or direct answer for that particular query right now.";
        }
        return finalOutput;
      } else {
        console.warn('AI model did not return any output for book suggestions/query. Returning default error.');
        return { ...defaultOutput, textResponse: "I'm sorry, I wasn't able to generate a response for that. Please try again." };
      }
    } catch (error: any) {
      console.error('Error during suggestBooksFlow:', error);
      let errorMessage = "An error occurred while trying to process your request. Please try again later.";
      if (error.message) {
         // General error message, as specific API key/quota messages for OpenAI are removed
         errorMessage = `I encountered an issue processing that: ${error.message}. Please try rephrasing or ask something else.`;
      }
      return { ...defaultOutput, textResponse: errorMessage };
    }
  }
);
