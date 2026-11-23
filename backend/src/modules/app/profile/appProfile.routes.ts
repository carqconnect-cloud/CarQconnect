import { Router } from 'express';
import { appProfileController } from './appProfile.controller';
import { asyncHandler } from '../../../common/utils/asyncHandler';

export const appProfileRouter = Router();

// Profile Update
appProfileRouter.put('/', asyncHandler(appProfileController.updateProfile));

// Sync & Get Addresses (supports both PUT /addresses and POST /sync-addresses)
appProfileRouter.put('/addresses', asyncHandler(appProfileController.syncAddresses));
appProfileRouter.post('/sync-addresses', asyncHandler(appProfileController.syncAddresses));
appProfileRouter.get('/addresses', asyncHandler(appProfileController.getAddresses));

// Sync & Get Emergency Contacts (supports both PUT /emergency-contacts and POST /sync-emergency-contacts)
appProfileRouter.put('/emergency-contacts', asyncHandler(appProfileController.syncEmergencyContacts));
appProfileRouter.post('/sync-emergency-contacts', asyncHandler(appProfileController.syncEmergencyContacts));
appProfileRouter.get('/emergency-contacts', asyncHandler(appProfileController.getEmergencyContacts));

// Self-Service Account Deletion (strictly app user only)
appProfileRouter.delete('/account', asyncHandler(appProfileController.deleteAccount));
appProfileRouter.post('/delete-account', asyncHandler(appProfileController.deleteAccount));
