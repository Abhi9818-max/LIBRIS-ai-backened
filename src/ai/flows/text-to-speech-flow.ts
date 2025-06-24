
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

const prepareNarrationPrompt = ai.definePrompt({
    name: 'prepareNarrationPrompt',
    input: { schema: z.object({ text: z.string() }) },
    output: { schema: z.object({ narratedText: z.string() }) },
    prompt: `You are an expert voice actor. Your task is to take a piece of text and prepare it for narration. Your goal is to make it sound like a real person is reading it with emotion, not a robot.

To do this, you should:
1.  Add punctuation like commas and ellipses (...) to create natural pauses and a more human, emotional cadence.
2.  Break up long sentences into shorter, more manageable fragments where appropriate to simulate natural breathing patterns.
3.  You can slightly rephrase parts for better flow, but stick to the original meaning.

IMPORTANT: Do NOT add any special formatting, markdown, annotations, or anything that isn't standard text and punctuation. The output must be ONLY the rewritten text, ready for a text-to-speech engine.

Here is the text to prepare:
{{{text}}}
`,
});


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
          throw new Error("Input text cannot be empty.");
      }
      
      // The TTS model has a limit on input characters. We truncate to leave room for the narration enrichment.
      const maxChars = 4000;
      const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;

      // Step 1: Use an LLM to enrich the text for more natural, emotional narration.
      const narrationResult = await prepareNarrationPrompt({ text: truncatedText });
      const textForSpeech = narrationResult.output?.narratedText || truncatedText;
      
      // Add validation to prevent crashing the TTS model with empty input.
      if (!textForSpeech || textForSpeech.trim().length === 0) {
        throw new Error("Text for narration became empty after AI processing. Cannot generate audio from empty text.");
      }

      // Step 2: Generate audio from the enriched text.
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
        // Re-throw a generic error to the client to avoid leaking implementation details.
        // The client's try/catch will handle this and show a friendly toast message.
        throw new Error("The AI narrator failed to generate audio. Please try again.");
    }
  }
);
