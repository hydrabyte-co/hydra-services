import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to deactivate or delete an instruction
 * that is currently being used by active agents
 */
export class InstructionInUseException extends HttpException {
  constructor(
    agentDetails: Array<{ id: string; name: string }>,
    operation: 'deactivate' | 'delete'
  ) {
    const agentList = agentDetails
      .map((agent) => `${agent.name} (ID: ${agent.id})`)
      .join(', ');

    const message =
      operation === 'deactivate'
        ? `Cannot deactivate instruction. It is currently being used by the following active agents: ${agentList}`
        : `Cannot delete instruction. It is currently being used by the following active agents: ${agentList}`;

    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        details: {
          operation,
          activeAgents: agentDetails,
        },
      },
      HttpStatus.CONFLICT
    );
  }
}
