import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigurationService } from '../configuration/configuration.service';
import { ConfigKey, RequestContext } from '@hydrabyte/shared';
import {
  OpenAIResponseRequest,
  OpenAIResponseData,
} from './interfaces/openai-response.interface';
import {
  GenerateTextRequestDto,
  GenerateTextResponseDto,
} from './dto/text-generation.dto';

@Injectable()
export class UtilService {
  private readonly logger = new Logger(UtilService.name);
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/responses';
  private readonly MODEL = 'gpt-5-nano';

  constructor(
    private readonly httpService: HttpService,
    private readonly configurationService: ConfigurationService,
  ) {}

  /**
   * Generate text using OpenAI Responses API
   */
  async generateText(
    request: GenerateTextRequestDto,
    context: RequestContext,
  ): Promise<GenerateTextResponseDto> {
    const { fieldDescription, userInput, maxLength } = request;

    // Get OpenAI API key from configuration
    this.logger.debug(`Fetching config key: ${ConfigKey.OPENAI_API_KEY}`);
    const config = await this.configurationService.findByKey(
      ConfigKey.OPENAI_API_KEY,
      context,
    );
    const apiKey = config?.value;
    this.logger.debug(`API Key retrieved: ${apiKey ? '***' + apiKey.slice(-4) : 'null'}`);

    if (!apiKey) {
      throw new HttpException(
        {
          error: {
            code: 'CONFIG_MISSING',
            message: 'OpenAI API key not configured',
            details: {
              configKey: ConfigKey.OPENAI_API_KEY,
              orgId: context.orgId,
            },
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Build system prompt with constraints
    const systemPrompt = this.buildSystemPrompt(fieldDescription, maxLength);

    // Prepare OpenAI request
    const openaiRequest: OpenAIResponseRequest = {
      model: this.MODEL,
      input: [
        {
          role: 'developer',
          content: [
            {
              type: 'input_text',
              text: systemPrompt,
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: userInput,
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'text',
        },
        verbosity: 'low', // Minimize verbose output
      },
      reasoning: {
        effort: 'minimal', // Fast generation
      },
      tools: [],
      store: false,
      include: ['reasoning.encrypted_content', 'web_search_call.action.sources'],
    };

    try {
      // Call OpenAI API
      const response = await firstValueFrom(
        this.httpService.post<OpenAIResponseData>(
          this.OPENAI_API_URL,
          openaiRequest,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            timeout: 30000,
          },
        ),
      );

      const data = response.data;

      // Extract text from response
      const rawText = this.extractTextFromResponse(data);

      // Post-process text
      const processedText = this.postProcessText(rawText, maxLength);

      this.logger.log(
        `Generated text: ${processedText.length} chars (truncated: ${processedText.length > (maxLength || Infinity)})`,
      );

      return {
        generatedText: processedText,
        length: processedText.length,
        truncated: maxLength ? processedText.length >= maxLength : false,
      };
    } catch (error: any) {
      this.logger.error('OpenAI API call failed', error);

      // Handle API errors
      if (error.response) {
        throw new HttpException(
          {
            error: {
              code: 'OPENAI_API_ERROR',
              message: 'Failed to generate text',
              details: {
                statusCode: error.response.status,
                message: error.response.data?.error?.message || error.message,
                type: error.response.data?.error?.type,
              },
            },
          },
          error.response.status,
        );
      }

      // Handle network errors
      throw new HttpException(
        {
          error: {
            code: 'NETWORK_ERROR',
            message: 'Failed to connect to OpenAI API',
            details: {
              message: error.message,
            },
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Build system prompt with constraints
   */
  private buildSystemPrompt(
    fieldDescription: string,
    maxLength?: number,
  ): string {
    const constraints = [
      'Chỉ trả về NỘI DUNG được yêu cầu',
      'KHÔNG sử dụng lời chào, xưng hô (anh, chị, em, bạn, v.v.)',
      'KHÔNG viết dạng thư từ, email',
      'KHÔNG có lời mở đầu hoặc kết thúc',
      'Viết ngắn gọn, đi thẳng vào nội dung',
    ];

    if (maxLength) {
      constraints.push(`Giới hạn tối đa ${maxLength} ký tự`);
    }

    return `${fieldDescription}

QUY TẮC:
${constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
  }

  /**
   * Extract text from OpenAI response
   */
  private extractTextFromResponse(data: OpenAIResponseData): string {
    if (data.status !== 'completed') {
      throw new HttpException(
        {
          error: {
            code: 'GENERATION_FAILED',
            message: `OpenAI response status: ${data.status}`,
            details: data.error,
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Find message output
    const messageOutput = data.output?.find((o) => o.type === 'message');
    if (!messageOutput || !messageOutput.content || messageOutput.content.length === 0) {
      throw new HttpException(
        {
          error: {
            code: 'NO_CONTENT',
            message: 'No text content in OpenAI response',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Extract text from first content item
    const textContent = messageOutput.content.find((c) => c.type === 'output_text');
    if (!textContent || !textContent.text) {
      throw new HttpException(
        {
          error: {
            code: 'NO_TEXT',
            message: 'No output_text in OpenAI response',
          },
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return textContent.text;
  }

  /**
   * Post-process text: remove greetings, trim, truncate
   */
  private postProcessText(text: string, maxLength?: number): string {
    let processed = text;

    // Remove common Vietnamese greetings and salutations
    const greetingPatterns = [
      /^(Kính gửi|Gửi|Chào|Xin chào|Thưa|Dear)\s+[^\n]+\n*/gi,
      /^(Anh|Chị|Em|Bạn|Quý khách)\s+[^\n,]+[,\n]/gi,
      /(Trân trọng|Thân ái|Best regards|Sincerely)[^\n]*$/gi,
      /^Dưới đây là\s+/gi,
      /^Đây là\s+/gi,
      /^Tôi xin (gửi|trình bày|cung cấp)\s+/gi,
    ];

    greetingPatterns.forEach((pattern) => {
      processed = processed.replace(pattern, '');
    });

    // Trim whitespace
    processed = processed.trim();

    // Remove leading/trailing quotes if present
    if (
      (processed.startsWith('"') && processed.endsWith('"')) ||
      (processed.startsWith("'") && processed.endsWith("'"))
    ) {
      processed = processed.slice(1, -1).trim();
    }

    // Truncate if exceeds maxLength
    if (maxLength && processed.length > maxLength) {
      // Try to truncate at sentence boundary
      const truncated = processed.substring(0, maxLength);
      const lastPeriod = truncated.lastIndexOf('.');
      const lastComma = truncated.lastIndexOf(',');

      if (lastPeriod > maxLength * 0.8) {
        processed = truncated.substring(0, lastPeriod + 1);
      } else if (lastComma > maxLength * 0.9) {
        processed = truncated.substring(0, lastComma);
      } else {
        processed = truncated.trim() + '...';
      }
    }

    return processed;
  }
}
