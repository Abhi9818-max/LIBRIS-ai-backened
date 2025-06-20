import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// Removed: import {openai} from '@genkit-ai/openai';

export const ai = genkit({
  plugins: [
    googleAI(),
    // Removed: openai(),
  ],
  model: 'googleai/gemini-1.5-flash-latest', // Set default model back to a Google AI model
});
