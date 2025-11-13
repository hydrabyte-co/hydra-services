import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../enum/websocket';
import { IResourceIdentification, IMessageMetadata } from '../../interfaces/websocket';

/**
 * Model download command data
 */
export class ModelDownloadDataDto {
  @IsEnum(['huggingface', 'minio', 'http'])
  source!: 'huggingface' | 'minio' | 'http';

  @IsString()
  @IsNotEmpty()
  sourcePath!: string; // e.g., 'openai/whisper-large-v3'

  @IsString()
  @IsOptional()
  version?: string; // Git branch/tag

  @IsString()
  @IsNotEmpty()
  targetPath!: string; // Local path on worker

  @IsObject()
  @IsOptional()
  credentials?: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Model download command message (Controller → Worker)
 */
export class ModelDownloadDto {
  @IsEnum(MessageType)
  type!: MessageType.MODEL_DOWNLOAD;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  timestamp!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  resource!: IResourceIdentification; // { type: 'model', id: 'whisper-large-v3' }

  @IsObject()
  @ValidateNested()
  @Type(() => ModelDownloadDataDto)
  data!: ModelDownloadDataDto;

  @IsOptional()
  @IsObject()
  metadata?: IMessageMetadata;
}
