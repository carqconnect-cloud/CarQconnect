
import { Role } from '@prisma/client';
import { Router } from 'express';

import { requireMinRole } from '../../common/middleware/authorize.middleware';
import { validate } from '../../common/middleware/validate.middleware';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { idParamSchema } from '../../common/validators/common.schema';
import { userController } from './user.controller';
import {
  inviteUserSchema,
  listUsersSchema,
  updateMemberSchema,
  updateProfileSchema,
} from './user.schema';

// Mounted behind requireAuth + resolveTenant (see src/routes/index.ts).
export const userRouter = Router();

userRouter.patch(
  '/me',
  validate({ body: updateProfileSchema }),
  asyncHandler(userController.updateProfile),
);

userRouter.get('/', validate({ query: listUsersSchema }), asyncHandler(userController.list));

userRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(userController.get));

userRouter.post(
  '/invite',
  requireMinRole(Role.TEAM_HEAD),
  validate({ body: inviteUserSchema }),
  asyncHandler(userController.invite),
);

userRouter.patch(
  '/:id',
  requireMinRole(Role.ADMIN),
  validate({ params: idParamSchema, body: updateMemberSchema }),
  asyncHandler(userController.update),
);

userRouter.delete(
  '/:id',
  requireMinRole(Role.ADMIN),
  validate({ params: idParamSchema }),
  asyncHandler(userController.remove),
);
