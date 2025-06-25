'use server';
/**
 * @fileOverview AI flow to convert text to speech.
 *
 * - textToSpeech - Function to convert text to speech.
 * - TextToSpeechInput - Input type for the function.
 * - TextToSpeechOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import wav from 'wav';
import {googleAI} from '@genkit-ai/googleai';

const TextToSpeechInputSchema = z.string().describe('The text to convert to speech.');
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

const TextToSpeechOutputSchema = z.object({
  audioDataUri: z.string().describe('The generated audio as a data URI.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;


export async function textToSpeech(text: TextToSpeechInput): Promise<TextToSpeechOutput> {
  return textToSpeechFlow(text);
}

async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', function (d) {
      bufs.push(d);
    });
    writer.on('end', function () {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

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
  async (query) => {
    try {
      const { media } = await ai.generate({
        model: googleAI.model('gemini-2.5-flash-preview-tts'),
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Algenib' },
            },
          },
        },
        prompt: query,
      });

      if (!media?.url) {
        throw new Error('No audio data returned from the model.');
      }
      
      const audioBuffer = Buffer.from(
        media.url.substring(media.url.indexOf(',') + 1),
        'base64'
      );

      if (audioBuffer.length === 0) {
        throw new Error('The model returned empty audio data.');
      }
      
      const wavBase64 = await toWav(audioBuffer);
      
      return {
        audioDataUri: 'data:audio/wav;base64,' + wavBase64,
      };

    } catch (error) {
      console.error('Error during textToSpeechFlow:', error);
      throw new Error('Failed to generate audio. Please try again.');
    }
  }
);
