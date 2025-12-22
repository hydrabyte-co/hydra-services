import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard, ApiCreateErrors } from '@hydrabyte/base';
import { UtilService } from './util.service';
import {
  GenerateTextRequestDto,
  GenerateTextResponseDto,
} from './dto/text-generation.dto';

@ApiTags('Utilities')
@ApiBearerAuth()
@Controller('util')
@UseGuards(JwtAuthGuard)
export class UtilController {
  constructor(private readonly utilService: UtilService) {}

  @Post('generate-text')
  @ApiOperation({
    summary: 'Generate text using AI',
    description:
      'Generate text content based on field description and user input using OpenAI GPT-5-nano model. ' +
      'The output is post-processed to remove greetings, salutations, and unnecessary formatting.',
  })
  @ApiResponse({
    status: 201,
    description: 'Text generated successfully',
    type: GenerateTextResponseDto,
  })
  @ApiCreateErrors()
  async generateText(
    @Body() request: GenerateTextRequestDto,
  ): Promise<GenerateTextResponseDto> {
    return this.utilService.generateText(request);
  }
}
