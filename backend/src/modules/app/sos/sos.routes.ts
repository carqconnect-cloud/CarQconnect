import { Router } from 'express';
import { sosController } from './sos.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const sosRouter = Router();

// Get SOS screen data (real emergency contacts, helplines, nearest emergency hospital)
sosRouter.get('/', asyncHandler(sosController.getSosData));
sosRouter.get('/contacts', asyncHandler(sosController.getSosData));
sosRouter.get('/nearest-hospital', asyncHandler(sosController.getNearestHospital));

// Emergency contact management
sosRouter.post('/contacts', asyncHandler(sosController.addContact));
sosRouter.put('/contacts/:id', asyncHandler(sosController.updateContact));
sosRouter.delete('/contacts/:id', asyncHandler(sosController.deleteContact));

// SOS Alert Trigger and Cancel flows
sosRouter.post('/trigger', asyncHandler(sosController.triggerAlert));
sosRouter.post('/cancel', asyncHandler(sosController.cancelAlert));
