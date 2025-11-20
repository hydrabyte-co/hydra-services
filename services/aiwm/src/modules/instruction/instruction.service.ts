import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseService } from '@hydrabyte/base';
import { Instruction } from './instruction.schema';

/**
 * InstructionService
 * Manages instruction entities for AI agent behavior
 * Extends BaseService for automatic CRUD operations
 */
@Injectable()
export class InstructionService extends BaseService<Instruction> {
  constructor(
    @InjectModel(Instruction.name) private instructionModel: Model<Instruction>
  ) {
    super(instructionModel);
  }

  // No custom methods needed - BaseService provides all CRUD operations:
  // - create(dto, context)
  // - findAll(query, context)
  // - findById(id, context)
  // - update(id, dto, context)
  // - delete(id, context)
  // - restore(id, context)

  // All methods include:
  // - RBAC permission checks
  // - Multi-tenant isolation
  // - Audit trail (createdBy, updatedBy)
  // - Soft delete support
}
