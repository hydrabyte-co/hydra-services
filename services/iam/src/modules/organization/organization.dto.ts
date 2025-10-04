import { IsNotEmpty, Matches, IsOptional, IsString } from 'class-validator';

export class CreateOrganizationDTO {
  @IsNotEmpty({ message: 'Name is required' })
  @Matches(/^[a-z0-9-]+$/, { message: 'Name must match [a-z0-9-]+' })
  name: string;

  @IsOptional()
  @IsString()
  description: string;
}

export class UpdateOrganizationDTO {
  @IsOptional()
  @Matches(/^[a-z0-9-]+$/, { message: 'Name must match [a-z0-9-]+' })
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
