
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
          console.warn("[TTS] textToSpeechFlow received empty text. Aborting.");
          return { media: '' };
      }
      
      const maxChars = 4000;
      const textForSpeech = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      console.log(`[TTS] Attempting to generate audio for text (first 100 chars): "${textForSpeech.substring(0, 100)}..."`);

      const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          audioEncoding: 'MP3',
          voiceConfig: {
            prebuiltVoiceConfig: {voiceName: voice || 'Algenib'},
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          ],
        },
        prompt: textForSpeech,
      });
      
      if (!media?.url) {
        console.warn('[TTS] AI model call succeeded but returned no audio media.');
        return { media: '' };
      }
      
      console.log(`[TTS] Successfully generated audio data URI (size: ${media.url.length}).`);
      return { media: media.url };

    } catch (error) {
        console.error("[TTS] Fatal error in textToSpeechFlow. The AI call likely failed. Returning empty media to prevent crash.", error);
        return { media: '' };
    }
  }
);
