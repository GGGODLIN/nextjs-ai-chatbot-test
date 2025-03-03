import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-small';

export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': openai('gpt-4o'),
    'chat-model-reasoning': wrapLanguageModel({
      model: fireworks('accounts/fireworks/models/deepseek-r1'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'chat-model-gemini': google('gemini-2.0-flash'),
    'chat-model-gemini-pro': google('gemini-2.0-pro-exp-02-05'),
    'chat-model-claude': anthropic('claude-3-7-sonnet-20250219'),
    'title-model': openai('gpt-4-turbo'),
    'artifact-model': openai('gpt-4o-mini'),
  },
  imageModels: {
    'small-model': openai.image('dall-e-2'),
    'large-model': openai.image('dall-e-3'),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model-small',
    name: 'gpt-4o-mini',
    description: 'Small model for fast, lightweight tasks',
  },
  {
    id: 'chat-model-large',
    name: 'gpt-4o',
    description: 'Large model for complex, multi-step tasks',
  },
  {
    id: 'chat-model-reasoning',
    name: 'deepseek-r1',
    description: 'Uses advanced reasoning',
  },
  {
    id: 'chat-model-gemini',
    name: 'gemini-2.0-flash',
    description: 'Uses Gemini 2.0 Flash',
  },
  {
    id: 'chat-model-gemini-pro',
    name: 'gemini-2.0-pro-exp-02-05',
    description: 'Uses Gemini 2.0 Pro',
  },
  {
    id: 'chat-model-claude',
    name: 'claude-3-7-sonnet-20250219',
    description: 'Uses Claude 3.7 Sonnet',
  },
];
