
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
import wav from 'wav';

const TextToSpeechInputSchema = z.object({
    text: z.string().describe("The text to convert to speech."),
    voice: z.string().describe("The name of the pre-built voice to use (e.g., 'Algenib').").default('Algenib'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;


const TextToSpeechOutputSchema = z.object({
  media: z.string().describe('The audio data as a base64-encoded WAV data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


export async function textToSpeech(input: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(input);
}

async function toWav(pcmData: Buffer, channels = 1, rate = 24000, sampleWidth = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => bufs.push(d));
    writer.on('end', () => resolve(Buffer.concat(bufs).toString('base64')));

    writer.write(pcmData);
    writer.end();
  });
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
      
      // The TTS model has a limit on input characters. We truncate to prevent errors.
      const maxChars = 4000;
      const textForSpeech = text.length > maxChars ? text.substring(0, maxChars) : text;
      
      // Generate audio directly from the text for better performance and reliability.
      const {media} = await ai.generate({
        model: 'googleai/gemini-2.5-flash-preview-tts',
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {voiceName: voice || 'Algenib'},
            },
          },
        },
        prompt: textForSpeech,
      });
      
      if (!media?.url) {
        throw new Error('No audio media was returned from the AI model.');
      }

      // The media URL is a data URI with base64-encoded PCM data. We need to extract it.
      const audioBase64 = media.url.substring(media.url.indexOf(',') + 1);

      if (!audioBase64) {
        throw new Error('The AI model returned empty audio data.');
      }

      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Convert the raw PCM data to a proper WAV format.
      const wavBase64 = await toWav(audioBuffer);

      if (!wavBase64) {
        throw new Error('Failed to convert audio to WAV format.');
      }

      return {
        media: 'data:audio/wav;base64,' + wavBase64,
      };
    } catch (error) {
        console.error("Fatal error in textToSpeechFlow:", error);
        // Return an empty object to prevent crashing the server flow.
        // The client will handle the empty response and show an error toast.
        return { media: '' };
    }
  }
);
