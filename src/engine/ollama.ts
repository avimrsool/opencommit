import axios, { AxiosInstance } from 'axios';
import { OpenAI } from 'openai';
import { removeContentTags } from '../utils/removeContentTags';
import { AiEngine, AiEngineConfig } from './Engine';

interface OllamaConfig extends AiEngineConfig {}

export class OllamaEngine implements AiEngine {
  config: OllamaConfig;
  client: AxiosInstance;

  constructor(config) {
    this.config = config;

    // Combine base headers with custom headers
    const headers = {
      'Content-Type': 'application/json',
      ...config.customHeaders
    };

    this.client = axios.create({
      baseURL: config.baseURL || 'http://localhost:11434',
      headers
    });
  }

  async generateCommitMessage(
    messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
  ): Promise<string | undefined> {
    // Convert chat messages to a single prompt for Ollama
    const prompt = messages
      .map(msg => {
        if (msg.role === 'system') {
          return `System: ${msg.content}`;
        } else if (msg.role === 'user') {
          return `User: ${msg.content}`;
        } else if (msg.role === 'assistant') {
          return `Assistant: ${msg.content}`;
        }
        return msg.content;
      })
      .join('\n\n');

    const params = {
      model: this.config.model ?? 'llama3.2:3b',
      prompt: prompt,
      stream: false
    };

    try {
      const response = await this.client.post('/api/generate', params);

      const { response: ollamaResponse } = response.data;
      let content = ollamaResponse;
      return removeContentTags(content, 'think');
    } catch (err: any) {
      const message = err.response?.data?.error ?? err.message;
      throw new Error(`Ollama provider error: ${message}`);
    }
  }
}
