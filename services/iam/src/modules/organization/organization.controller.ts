import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BaseController, FindAllQuery, FindManyResult, JwtAuthGuard } from '@hydrabyte/base';
import { OrganizationsService } from './organization.service';
import { Organization } from './organization.schema';
import {
  CreateOrganizationDTO,
  UpdateOrganizationDTO,
} from './organization.dto';

@Controller('organizations')
export class OrganizationsController extends BaseController<Organization> {
  constructor(private readonly organizationsService: OrganizationsService) {
    super(organizationsService);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      enableDebugMessages: true,
    })
  )
  async create(
    @Body() createDTO: CreateOrganizationDTO,
    @Req() req,
  ): Promise<Partial<Organization>> {
    const context = this.getContext(req);
    return this.organizationsService.create(createDTO, context);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(
    @Query() query: FindAllQuery,
    @Req() req
  ): Promise<FindManyResult<Organization>> {
    return super.findAll(query, req);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req): Promise<Organization | null> {
    return super.findOne(id, req);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDTO: UpdateOrganizationDTO,
    @Req() req
  ): Promise<Organization | null> {
    return super.update(id, updateDTO, req);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req): Promise<Organization | null> {
    return super.delete(id, req);
  }
}
