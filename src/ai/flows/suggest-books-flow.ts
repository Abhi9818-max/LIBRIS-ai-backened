
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
  prompt: `You are a knowledgeable and helpful AI Librarian and Book Expert. Your primary goal is to engage in a coherent, context-aware conversation.
**You MUST pay very close attention to the entire conversation history to understand the full context of the user's current query and to inform your responses.** Your knowledge is based on information available up to your last training update (early 2023).

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
1.  Analyze the user's current query meticulously in the context of the ENTIRE conversation history.
2.  If the query clearly asks for book recommendations based on themes, genres, or older books (well within your training knowledge):
    Provide 3 to 5 thoughtful and diverse book suggestions. For each book, include the title, the author, and a compelling, specific, and insightful reason (2-3 sentences) why it's a good recommendation *directly related to the user's query and the ongoing conversation*. Populate the 'suggestions' field. Ensure these reasons are rich and detailed, not generic.
3.  If the user asks a general question or a follow-up question (e.g., "Tell me more about [book from history]", "Why was [book from history] banned?", "What are common themes in dystopian fiction?", "What was your last suggestion about?"):
    **Crucially, if the user's query is a follow-up question about books, authors, or topics mentioned previously in the conversation history (either by you or the user), your absolute priority is to answer that question directly and comprehensively using the 'textResponse' field. You MUST reference the specific books or topics from the history in your answer.** Provide a helpful, informative, and detailed text response. Do not offer new suggestions unless the current query explicitly asks for new or different ones. Use the conversation history as your primary guide. If the follow-up asks for information you might not have (e.g., "Why was [specific, obscure detail about a book] banned?"), state what you know and acknowledge if your knowledge base might not cover that specific detail.
4.  If the query is ambiguous:
    You can ask for clarification or offer a relevant general response in the 'textResponse' field, always considering the history.
5.  Output Format:
    Only use the 'suggestions' output structure when you are providing a list of NEW book recommendations. Otherwise, use the 'textResponse' output field for all other answers. Do not populate both. If providing suggestions, do not also provide a generic textResponse like "Here are some suggestions". Let the suggestions speak for themselves.
6.  Knowledge Cutoff Clarification:
    When a query touches on potentially very new topics (e.g. books published in the current year, recent literary news), gently state that your knowledge is based on information available up to your last training update (early 2023) and you cannot access real-time information.

Ensure your response is in the structured JSON format as requested by the output schema. Be thoughtful and detailed.
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
    // Using gemini-1.5-pro for potentially better understanding of nuanced follow-ups
    // Be mindful of API quota/costs if using this model frequently.
    // model: 'googleai/gemini-1.5-pro-latest', 
  },
  async (input): Promise<SuggestBooksOutput> => {
    try {
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
        // If the AI somehow returns both, and the prompt asks it not to,
        // we might prioritize textResponse if it's substantial, or if suggestions seem like a fallback.
        // For now, adhering to the prompt, which implies one or the other should be dominant.
        // If both are present, returning as-is for now, but ideally prompt should prevent this.
        if (output.textResponse && output.suggestions && output.suggestions.length > 0) {
            console.warn("AI returned both textResponse and suggestions. Prompt may need further refinement. Prioritizing textResponse if it's substantive.");
            // Simple heuristic: if textResponse is more than just a placeholder.
            return output.textResponse.length > 50 ? { textResponse: output.textResponse } : output;
        }
        if (Object.keys(output).length === 0) {
           console.warn('AI model returned an empty object. This might be intentional or an issue.');
           return { textResponse: "I processed your request, but I don't have a specific suggestion or direct answer for that particular query right now." };
        }
        return output; 
      } else {
        console.warn('AI model did not return any output for book suggestions/query. Returning default error.');
        // This indicates a more fundamental issue with the AI call, not just an empty valid response.
        return { textResponse: "I'm sorry, I wasn't able to generate a response for that. Please try again." };
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
            // General error message for other cases
            errorMessage = `I encountered an issue processing that: ${error.message}. Please try rephrasing or ask something else.`;
        }
      }
      return { textResponse: errorMessage };
    }
  }
);

