
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
  media: z.string().describe('The audio data as a data URI, or an empty string on failure.'),
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
    // This is the final, robust implementation.
    // It prioritizes stability and speed over complex processing.
    try {
      const { text, voice } = input;

      // 1. Input Validation: Abort if the text is empty to prevent unnecessary AI calls.
      if (!text || text.trim().length === 0) {
          console.warn("[TTS] textToSpeechFlow received empty text. Aborting.");
          return { media: '' };
      }
      
      // 2. Truncation: The TTS model has limits. Truncate text to a safe length
      // to prevent the model from failing on very long pages. 4000 characters is a safe limit.
      const maxChars = 4000;
      const textForSpeech = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      console.log(`[TTS] Attempting to generate audio for text (first 100 chars): "${textForSpeech.substring(0, 100)}..."`);

      // 3. Direct AI Call: Generate MP3 audio directly for speed and efficiency.
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          audioEncoding: 'MP3', // Requesting MP3 directly is much more efficient.
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: voice || 'Algenib'},
          },
          // Permissive safety settings to avoid flagging literary content.
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        },
        prompt: textForSpeech,
      });
      
      // 4. Output Validation: Ensure the model returned a valid audio URL.
      if (!media?.url) {
        console.warn('[TTS] AI model call succeeded but returned no audio media.');
        return { media: '' };
      }
      
      console.log(`[TTS] Successfully generated audio data URI (size: ${media.url.length}).`);
      return { media: media.url };

    } catch (error) {
        // 5. Bulletproof Error Handling: Catch ANY error during the process.
        // Log the real error for debugging, but return a safe, empty response to the client
        // to prevent the entire application from crashing.
        console.error("[TTS] Fatal error in textToSpeechFlow. The AI call likely failed. Returning empty media to prevent crash.", error);
        return { media: '' };
    }
  }
);
