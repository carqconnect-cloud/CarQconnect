import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../../../common/utils/asyncHandler';
import { documentsController } from './documents.controller';
import { validate } from '../../../common/middleware/validate.middleware';
import { createDocumentSchema, updateDocumentSchema } from './documents.schema';

const upload = multer({ storage: multer.memoryStorage() });

export const documentsRouter = Router();

documentsRouter.get('/', asyncHandler(documentsController.getAllDocuments));
documentsRouter.post('/', validate({ body: createDocumentSchema }), asyncHandler(documentsController.createDocument));
documentsRouter.post('/upload', upload.single('file'), asyncHandler(documentsController.uploadFile));
documentsRouter.get('/:id', asyncHandler(documentsController.getDocument));
documentsRouter.patch('/:id', validate({ body: updateDocumentSchema }), asyncHandler(documentsController.updateDocument));
documentsRouter.delete('/:id', asyncHandler(documentsController.deleteDocument));
