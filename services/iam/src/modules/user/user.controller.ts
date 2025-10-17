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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BaseController, JwtAuthGuard, FindAllQuery, FindManyResult } from '@hydrabyte/base';
import { UsersService } from './user.service';
import { User } from './user.schema';
import { CreateUserData, UpdateUserData } from './user.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
export class UsersController extends BaseController<User> {
  constructor(private readonly userService: UsersService) {
    super(userService);
  }

  @Post()
  @ApiOperation({ summary: 'Create user', description: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
  @ApiOperation({ summary: 'Get all users', description: 'Get list of users with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async findAll(
    @Query() query: FindAllQuery,
    @Req() req
  ): Promise<FindManyResult<User>> {
    return super.findAll(query, req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID', description: 'Get a single user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Req() req): Promise<User | null> {
    return super.findOne(id, req);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user', description: 'Update user information' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
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
  @ApiOperation({ summary: 'Delete user', description: 'Soft delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Req() req): Promise<User | null> {
    return super.delete(id, req);
  }
}
