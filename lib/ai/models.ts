import { openai } from '@ai-sdk/openai';
import { fireworks } from '@ai-sdk/fireworks';
import { google } from '@ai-sdk/google';
import { anthropic } from '@ai-sdk/anthropic';
import { deepseek } from '@ai-sdk/deepseek';
import { xai } from '@ai-sdk/xai';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';

export const DEFAULT_CHAT_MODEL: string = 'chat-model-gemini';

export const myProvider = customProvider({
  languageModels: {
    'chat-model-small': openai('gpt-4o-mini'),
    'chat-model-large': openai('gpt-4o'),
    'chat-model-gpt4.5': openai('gpt-4.5-preview'),
    // 'chat-model-reasoning': wrapLanguageModel({
    //   model: fireworks('accounts/fireworks/models/deepseek-r1'),
    //   middleware: extractReasoningMiddleware({ tagName: 'think' }),
    // }),
    'chat-model-deepseek-r1': deepseek('deepseek-reasoner'),
    'chat-model-deepseek-v3': deepseek('deepseek-chat'),
    'chat-model-grok-2': xai('grok-2-1212'),
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

export interface ChatModel {
  id: string;
  name: string;
  description: string;
  disabled?: boolean;
  disabledReason?: string;
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
    id: 'chat-model-gpt4.5',
    name: 'gpt-4.5-preview',
    description: 'Uses GPT-4.5',
    disabled: true,
    disabledReason: '太貴了，問一次要4鎂'
  },
  // {
  //   id: 'chat-model-reasoning',
  //   name: 'deepseek-r1',
  //   description: 'Uses advanced reasoning',
  // },

  {
    id: 'chat-model-deepseek-v3',
    name: 'deepseek-chat',
    description: 'Uses DeepSeek Chat(V3)',
  },
  {
    id: 'chat-model-deepseek-r1',
    name: 'deepseek-reasoner',
    description: 'Uses DeepSeek Reasoner(R1)',
  },
  {
    id: 'chat-model-gemini',
    name: 'gemini-2.0-flash',
    description: 'Uses Gemini 2.0 Flash',
    disabled: false,
    disabledReason: '配額已用盡，請稍後再試'
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
  {
    id: 'chat-model-grok-2',
    name: 'grok-2',
    description: 'Uses Grok 2',
  },
];