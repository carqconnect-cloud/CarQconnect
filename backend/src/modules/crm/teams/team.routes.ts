import { Router } from 'express';
import { validate } from '../../../common/middleware/validate.middleware';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { idParamSchema } from '../../../common/validators/common.schema';
import { teamController } from './team.controller';
import { createTeamSchema, listTeamsSchema, updateTeamSchema } from './team.schema';

export const teamRouter = Router();

teamRouter.get('/', validate({ query: listTeamsSchema }), asyncHandler(teamController.list));
teamRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(teamController.get));
teamRouter.get('/:id/metrics', validate({ params: idParamSchema }), asyncHandler(teamController.metrics));

teamRouter.post(
  '/',
  validate({ body: createTeamSchema }),
  asyncHandler(teamController.create),
);
teamRouter.patch(
  '/:id',
  validate({ params: idParamSchema, body: updateTeamSchema }),
  asyncHandler(teamController.update),
);
teamRouter.delete(
  '/:id',
  validate({ params: idParamSchema }),
  asyncHandler(teamController.remove),
);
