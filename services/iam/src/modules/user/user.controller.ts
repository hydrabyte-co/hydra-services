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
import { BaseController, JwtAuthGuard, FindAllQuery, FindManyResult } from '@hydrabyte/base';
import { UsersService } from './user.service';
import { User } from './user.schema';
import { CreateUserData, UpdateUserData } from './user.dto';

@Controller('users')
export class UsersController extends BaseController<User> {
  constructor(private readonly userService: UsersService) {
    super(userService);
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
    @Body() createDTO: CreateUserData,
    @Req() req
  ): Promise<Partial<User>> {
    const context = this.getContext(req);
    return this.userService.create(createDTO, context);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(
    @Query() query: FindAllQuery,
    @Req() req
  ): Promise<FindManyResult<User>> {
    return super.findAll(query, req);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req): Promise<User | null> {
    return super.findOne(id, req);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(
    @Param('id') id: string,
    @Body() updateDTO: UpdateUserData,
    @Req() req
  ): Promise<User | null> {
    return super.update(id, updateDTO, req);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req): Promise<User | null> {
    return super.delete(id, req);
  }
}
