import { vehicleDatasetService } from './vehicleDataset.service';
import type { Request, Response } from 'express';
import { appQrService } from './appQr.service';
import { vehicleImageService } from './vehicleImage.service';

export const appQrController = {
  async lookupVehicle(req: Request, res: Response) {
    const query = (req.query.q || req.query.query || '').toString();
    const results = vehicleDatasetService.search(query, 10);
    const detected = vehicleDatasetService.detectType(query);
    res.json({
      success: true,
      data: results,
      detectedType: detected.type,
      detectedFuel: detected.fuelEnum,
    });
  },

  async getVehicles(req: Request, res: Response) {
    const userId = req.auth!.userId as string;
    const vehicles = await appQrService.getVehicles(userId);
    res.json({ success: true, data: vehicles });
  },

  async addVehicle(req: Request, res: Response) {
    const userId = req.auth!.userId as string;
    const vehicle = await appQrService.addVehicle(userId, req.body);
    res.json({ success: true, data: vehicle });
  },

  async getQrTags(req: Request, res: Response) {
    const userId = req.auth!.userId as string;
    const tags = await appQrService.getQrTags(userId);
    res.json({ success: true, data: tags });
  },

  async linkQrTag(req: Request, res: Response) {
    const userId = req.auth!.userId as string;
    const tag = await appQrService.linkQrTag(userId, req.body);
    res.json({ success: true, data: tag });
  },

  async updateQrPrivacy(req: Request, res: Response) {
    const userId = req.auth!.userId as string;
    const tagId = req.params.tagId as string;
    const tag = await appQrService.updateQrPrivacy(userId, tagId, req.body);
    res.json({ success: true, data: tag });
  },

  async getPublicTagInfo(req: Request, res: Response) {
    const tagId = req.params.tagId as string;
    const tagInfo = await appQrService.getPublicTagInfo(tagId);
    res.json({ success: true, data: tagInfo });
  },

  async initiateMaskedCall(req: Request, res: Response, next: import('express').NextFunction) {
    try {
      const tagId = req.params.tagId as string;
      const { callerPhone, targetType } = req.body;
      
      console.log(`[INITIATE MASKED CALL] Tag: ${tagId}, Caller: ${callerPhone}, Target: ${targetType || 'owner'}`);
      
      if (!callerPhone) {
        res.status(400).json({ success: false, message: 'Caller phone is required' });
        return;
      }

      const result = await appQrService.initiateMaskedCall(tagId, callerPhone, targetType || 'owner');
      console.log(`[INITIATE MASKED CALL] Result:`, result);
      res.json({ success: true, data: result, message: 'Masked call initiated successfully' });
    } catch (e) {
      console.error(`[INITIATE MASKED CALL] Error:`, e);
      next(e);
    }
  },

  async sendOwnerMessage(req: Request, res: Response, next: import('express').NextFunction) {
    try {
      const tagId = req.params.tagId as string;
      const { message, callerPhone } = req.body;

      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        res.status(400).json({ success: false, message: 'Message content is required' });
        return;
      }

      const result = await appQrService.sendMessageToOwner(tagId, message.trim(), callerPhone);
      res.json({ success: true, data: result, message: 'Alert message sent to vehicle owner successfully' });
    } catch (e) {
      next(e);
    }
  },

  async getVehicleImage(req: Request, res: Response) {
    const query = ((req.query.query as string) || (req.query.q as string) || '').trim();
    if (!query) {
      res.json({ success: true, data: { imageUrl: 'assets/homescreensicons/carimage.png', query } });
      return;
    }
    const imageUrl = await vehicleImageService.searchVehicleImage(query);
    res.json({ success: true, data: { imageUrl, query } });
  },

  async getVehicleModel(req: Request, res: Response) {
    const modelType = ((req.query.type as string) || 'car').toLowerCase();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'l44x18ko';
    const defaultModelUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/models/car_original_quality.glb`;
    const modelUrl = process.env.CAR_3D_MODEL_URL || defaultModelUrl;

    res.json({
      success: true,
      data: {
        modelUrl,
        type: modelType,
        format: 'glb',
        cloudName,
        optimizedUrl: defaultModelUrl,
        fallbackAsset: 'assets/models/Car_3d_Model.glb',
      },
    });
  },
};
