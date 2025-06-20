import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';
// import {openai} from '@genkit-ai/openai'; // Removed OpenAI import

export const ai = genkit({
  plugins: [
    googleAI(), // Re-enabled Google AI plugin
    // openai(),   // OpenAI plugin removed
  ],
  model: 'googleai/gemini-1.5-flash-latest', // Set default model back to a Google AI model
});
