import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Exception thrown when attempting to deactivate or delete a model
 * that is currently being used by active deployments
 */
export class ModelInUseException extends HttpException {
  constructor(
    deploymentDetails: Array<{ id: string; name: string }>,
    operation: 'deactivate' | 'delete'
  ) {
    const deploymentList = deploymentDetails
      .map((deployment) => `${deployment.name} (ID: ${deployment.id})`)
      .join(', ');

    const message =
      operation === 'deactivate'
        ? `Cannot deactivate model. It is currently being used by the following active deployments: ${deploymentList}`
        : `Cannot delete model. It is currently being used by the following active deployments: ${deploymentList}`;

    super(
      {
        statusCode: HttpStatus.CONFLICT,
        message,
        error: 'Conflict',
        details: {
          operation,
          activeDeployments: deploymentDetails,
        },
      },
      HttpStatus.CONFLICT
    );
  }
}
