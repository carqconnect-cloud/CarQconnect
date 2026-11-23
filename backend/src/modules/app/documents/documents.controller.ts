import type { Request, Response } from 'express';
import { documentsService } from './documents.service';
import { uploadToCloudinary } from '../../../common/utils/cloudinary';

export const documentsController = {
  getAllDocuments: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const documents = await documentsService.getAllDocuments(userId);
    res.json({ success: true, data: documents });
  },

  getDocument: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const document = await documentsService.getDocumentById(userId, req.params.id as string);
    res.json({ success: true, data: document });
  },

  createDocument: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const document = await documentsService.createDocument(userId, req.body);
    res.status(201).json({ success: true, data: document });
  },

  uploadFile: async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }
    
    try {
      const url = await uploadToCloudinary(req.file.buffer, 'carqconnect/documents');
      res.json({ success: true, url });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
  },

  updateDocument: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    const document = await documentsService.updateDocument(userId, req.params.id as string, req.body);
    res.json({ success: true, data: document });
  },

  deleteDocument: async (req: Request, res: Response) => {
    const userId = req.auth!.userId;
    await documentsService.deleteDocument(userId, req.params.id as string);
    res.json({ success: true, message: 'Document deleted successfully' });
  }
};
