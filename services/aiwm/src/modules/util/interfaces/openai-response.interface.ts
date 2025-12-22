/**
 * OpenAI Responses API interfaces
 * Based on https://api.openai.com/v1/responses
 */

export interface OpenAIResponseRequest {
  model: string;
  input: OpenAIInputMessage[];
  text?: {
    format?: {
      type: 'text';
    };
    verbosity?: 'low' | 'medium' | 'high';
  };
  reasoning?: {
    effort?: 'minimal' | 'low' | 'medium' | 'high';
  };
  tools?: any[];
  store?: boolean;
  include?: string[];
}

export interface OpenAIInputMessage {
  role: 'developer' | 'user';
  content: OpenAIInputContent[];
}

export interface OpenAIInputContent {
  type: 'input_text';
  text: string;
}

export interface OpenAIResponseData {
  id: string;
  object: string;
  created_at: number;
  status: 'completed' | 'failed' | 'in_progress';
  model: string;
  output: OpenAIOutput[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code?: string;
  };
}

export interface OpenAIOutput {
  id: string;
  type: 'reasoning' | 'message';
  status?: 'completed';
  content?: OpenAIOutputContent[];
  role?: 'assistant';
}

export interface OpenAIOutputContent {
  type: 'output_text';
  text: string;
  annotations?: any[];
  logprobs?: any[];
}
