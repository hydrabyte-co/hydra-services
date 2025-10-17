import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Query, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, CurrentUser, PaginationQueryDto } from '@hydrabyte/base';
import { RequestContext } from '@hydrabyte/shared';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './category.dto';

@ApiTags('categories')
@ApiBearerAuth('JWT-auth')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({ summary: 'Create category', description: 'Create a new category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.categoryService.create(createCategoryDto, context);
  }

  @Get()
  @ApiOperation({ summary: 'Get all categories', description: 'Retrieve list of all categories with pagination' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Query() paginationQuery: PaginationQueryDto,
    @CurrentUser() context: RequestContext,
  ) {
    return this.categoryService.findAll(paginationQuery, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID', description: 'Retrieve a single category by ID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    const category = await this.categoryService.findOne(id, context);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return category;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category', description: 'Update category information' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @CurrentUser() context: RequestContext,
  ) {
    const updated = await this.categoryService.updateCategory(id, updateCategoryDto, context);
    if (!updated) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
    return updated;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category', description: 'Soft delete a category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @UseGuards(JwtAuthGuard)
  async remove(
    @Param('id') id: string,
    @CurrentUser() context: RequestContext,
  ) {
    await this.categoryService.remove(id, context);
    return { message: 'Category deleted successfully' };
  }
}
