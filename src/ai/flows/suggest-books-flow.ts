
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
// import {performWebSearchTool} from '@/ai/tools/web-search-tool'; // Removed web search tool

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
  // searchedWeb: z.boolean().optional().describe("Indicates if a web search was performed to answer this query.") // Removed searchedWeb
});
export type SuggestBooksOutput = z.infer<typeof SuggestBooksOutputSchema>;

export async function suggestBooks(input: SuggestBooksInput): Promise<SuggestBooksOutput> {
  return suggestBooksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestBooksPrompt', // Reverted name
  input: {schema: SuggestBooksInputSchema},
  output: {schema: SuggestBooksOutputSchema},
  // tools: [performWebSearchTool], // Removed web search tool
  model: 'googleai/gemini-1.5-flash-latest',
  prompt: `You are a knowledgeable and helpful AI Librarian and Book Expert. Your primary goal is to engage in a coherent, context-aware conversation.
Your knowledge is based on information available up to your last training update (early 2023).
You DO NOT have access to real-time web search. If a query requires information beyond early 2023, clearly state that your knowledge is limited to that timeframe.

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

2.  **Answering and Recommending (Using Internal Knowledge Only)**:
    *   **Follow-up Questions**: If the user asks a follow-up question (e.g., "Tell me more about [book from history]", "Why was [book from history] banned?", "What was your last suggestion about?"), your **absolute priority** is to answer that question directly and comprehensively using the 'textResponse' field. You MUST reference the specific books or topics from the history in your answer.
    *   **Book Recommendations**: If the query clearly asks for book recommendations, provide 3 to 5 thoughtful and diverse suggestions from your knowledge base (up to early 2023). For each book, include title, author, and a compelling, specific reason (2-3 sentences) directly related to the user's query and conversation. Populate the 'suggestions' field.
    *   **General Questions/Information Synthesis**: For other questions, provide a helpful, informative text response based on your training data.

3.  **Handling Information Gaps**:
    *   If the query asks about topics, books, authors, or literary events published or occurring *after early 2023*, clearly state that your knowledge cutoff is early 2023 and you cannot provide information on more recent developments. Do not invent information.
    *   If you cannot answer or find information even within your training data, say so.

4.  **Output Format**:
    *   Only use the 'suggestions' field when providing NEW book recommendations.
    *   Otherwise, use 'textResponse' for all other answers (general info, follow-ups, explanations of knowledge limits).
    *   Do NOT populate both 'suggestions' and 'textResponse' in the same output. If you must provide suggestions AND a text response, prioritize a comprehensive textResponse.

Ensure your response is in the structured JSON format as requested by the output schema. Be thoughtful and detailed.
`,
});

const defaultOutput: SuggestBooksOutput = {
  textResponse: "I'm sorry, I couldn't process that request. Please try again or rephrase your query.",
  suggestions: [],
  // searchedWeb: false, // Removed
};

const suggestBooksFlow = ai.defineFlow(
  {
    name: 'suggestBooksFlow', // Reverted name
    inputSchema: SuggestBooksInputSchema,
    outputSchema: SuggestBooksOutputSchema,
  },
  async (input): Promise<SuggestBooksOutput> => {
    try {
      const filteredHistory = input.history?.filter(item => item.content && item.content.trim() !== "") || [];
      const promptInput = { ...input, history: filteredHistory };

      const {output} = await prompt(promptInput); // Removed flowExecutionHistory as no tools are used

      if (output) {
        const finalOutput: SuggestBooksOutput = { }; // searchedWeb removed

        if (output.suggestions && output.suggestions.length > 0 && !output.textResponse) {
            finalOutput.suggestions = output.suggestions;
        } else if (output.textResponse && (!output.suggestions || output.suggestions.length === 0)) {
            finalOutput.textResponse = output.textResponse;
        } else if (output.textResponse && output.suggestions && output.suggestions.length > 0) {
            console.warn("AI returned both textResponse and suggestions. Prioritizing textResponse.");
            finalOutput.textResponse = output.textResponse;
            if (!output.textResponse.toLowerCase().includes("suggestion")) {
                 finalOutput.textResponse += `\n\nI also found some book suggestions: ${output.suggestions.map(s => s.title).join(', ')}. Would you like to know more about them?`;
            }
        } else if (Object.keys(output).length === 0 || (!output.textResponse && (!output.suggestions || output.suggestions.length === 0))) {
           console.warn('AI model returned an empty or insufficient object.');
           finalOutput.textResponse = "I processed your request, but I don't have a specific suggestion or direct answer for that particular query right now.";
        } else {
           if(output.textResponse) finalOutput.textResponse = output.textResponse;
           if(output.suggestions) finalOutput.suggestions = output.suggestions;
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
        if (error.message.includes("API key not valid") || error.message.includes("authentication")) {
            errorMessage = "There's an issue with an AI service configuration. Please contact support.";
        } else if (error.message.includes("quota") || error.message.includes("rate limit") || error.message.includes("429")) {
            errorMessage = "The AI service is temporarily busy or rate limits have been reached. Please try again in a few moments.";
        } else if (error.message.toLowerCase().includes("model not found") || error.message.toLowerCase().includes("invalid model")) {
            errorMessage = "The configured AI model is currently unavailable or invalid. Please check the AI service status or configuration."
        }
         else {
            errorMessage = `I encountered an issue processing that: ${error.message}. Please try rephrasing or ask something else.`;
        }
      }
      return { ...defaultOutput, textResponse: errorMessage };
    }
  }
);
