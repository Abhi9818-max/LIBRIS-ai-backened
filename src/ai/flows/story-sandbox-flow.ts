
'use server';
/**
 * @fileOverview AI flow to generate "what if" stories based on a book.
 *
 * - generateWhatIfStory - Function to generate the story.
 * - StorySandboxInput - Input type for the function.
 * - StorySandboxOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StorySandboxInputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().describe('The author of the book.'),
  summary: z.string().describe('A brief summary of the book.'),
  prompt: z.string().describe("The user's 'what if' prompt for the story."),
});
export type StorySandboxInput = z.infer<typeof StorySandboxInputSchema>;

const StorySandboxOutputSchema = z.object({
  story: z.string().describe('The generated short story.'),
});
export type StorySandboxOutput = z.infer<typeof StorySandboxOutputSchema>;

export async function generateWhatIfStory(input: StorySandboxInput): Promise<StorySandboxOutput> {
  return storySandboxFlow(input);
}

const prompt = ai.definePrompt({
  name: 'storySandboxPrompt',
  input: {schema: StorySandboxInputSchema},
  output: {schema: StorySandboxOutputSchema},
  prompt: `You are a master storyteller and creative writer. Your task is to write a short, imaginative story (a few paragraphs long) based on a classic book and a "what if" scenario provided by the user.

Book Details:
- Title: {{{title}}}
- Author: {{{author}}}
- Summary: {{{summary}}}

User's "What If" Prompt:
"{{{prompt}}}"

Instructions:
1.  Thoroughly understand the original book's context from the title, author, and summary.
2.  Embrace the user's "what if" prompt as the central theme for your new story.
3.  Write a creative, entertaining, and engaging short story that explores this alternate reality.
4.  Try to capture the tone and style of the original author, but prioritize making the story fun and imaginative.
5.  Return ONLY the story text in the 'story' field of the JSON output.`,
});

const storySandboxFlow = ai.defineFlow(
  {
    name: 'storySandboxFlow',
    inputSchema: StorySandboxInputSchema,
    outputSchema: StorySandboxOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      if (output?.story) {
        return {story: output.story};
      } else {
        console.warn('AI did not return a story.');
        return {story: "The storyteller seems to be at a loss for words. Please try a different prompt."};
      }
    } catch (error) {
      console.error('Error during storySandboxFlow:', error);
      // Return a user-friendly error message
      return {story: "The storyteller seems to be at a loss for words and could not generate a story. Please try again."};
    }
  }
);
