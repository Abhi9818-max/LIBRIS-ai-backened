
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
    const { text, voice } = input;
    if (!text || text.trim().length === 0) {
        throw new Error("Input text cannot be empty.");
    }
    
    // The TTS model has a limit on input characters, so we truncate if necessary.
    // This prevents errors for very long pages of text.
    const aumaxChars = 5000;
    const truncatedText = text.length > aumaxChars ? text.substring(0, aumaxChars) : text;


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
      prompt: truncatedText,
    });
    
    if (!media?.url) {
      throw new Error('No audio media was returned from the AI model.');
    }

    // The media URL is a data URI with base64-encoded PCM data. We need to extract it.
    const audioBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
    
    // Convert the raw PCM data to a proper WAV format.
    const wavBase64 = await toWav(audioBuffer);

    return {
      media: 'data:audio/wav;base64,' + wavBase64,
    };
  }
);
