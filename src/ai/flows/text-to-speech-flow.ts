
'use server';

/**
 * @fileOverview An AI flow to convert text into speech with a selectable voice.
 *
 * - textToSpeech - A function that handles the text-to-speech conversion.
 * - TextToSpeechInput - The input type for the textToSpeech function.
 * - TextToSpeechOutput - The return type for the textToSpeech function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TextToSpeechInputSchema = z.object({
    text: z.string().describe("The text to convert to speech."),
    voice: z.string().describe("The name of the pre-built voice to use (e.g., 'Algenib').").default('Algenib'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;


const TextToSpeechOutputSchema = z.object({
  media: z.string().describe('The audio data as a data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

const textToSpeechFlow = ai.defineFlow(
  {
    name: 'textToSpeechFlow',
    inputSchema: TextToSpeechInputSchema,
    outputSchema: TextToSpeechOutputSchema,
  },
  async (input) => {
    try {
      const { text, voice } = input;
      if (!text || text.trim().length === 0) {
          console.warn("textToSpeechFlow received empty text. Aborting.");
          return { media: '' };
      }
      
      const maxChars = 4000;
      const textForSpeech = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            // Request MP3 output directly to improve performance and reduce payload size.
            audioEncoding: 'MP3',
            voiceConfig: {
              prebuiltVoiceConfig: {voiceName: voice || 'Algenib'},
            },
          },
          // Loosening safety settings to prevent false positives on book content.
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        },
        prompt: textForSpeech,
      });
      
      if (!media?.url) {
        console.warn('No audio media was returned from the AI model.');
        return { media: '' };
      }

      // The AI now returns a direct data URI for the MP3 audio.
      return { media: media.url };

    } catch (error) {
        console.error("Fatal error in textToSpeechFlow, returning empty media to prevent crash:", error);
        // Return an empty object to prevent crashing the server flow.
        // The client will handle the empty response and show an error toast.
        return { media: '' };
    }
  }
);
