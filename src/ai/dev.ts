
import { config } from 'dotenv';
config();

import '@/ai/flows/extract-book-metadata.ts';
import '@/ai/flows/generate-book-cover-flow.ts';
import '@/ai/flows/suggest-books-flow.ts';
// Removed import for web search tool
