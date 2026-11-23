import { prisma } from '../../../config/database';
import { ApiError } from '../../../common/utils/apiError';
import { syncUserToCustomer } from '../../../common/utils/customerSync';
import type { CreateDocumentInput, UpdateDocumentInput } from './documents.schema';

export const documentsService = {
  async getAllDocuments(userId: string) {
    return prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getDocumentById(userId: string, id: string) {
    const document = await prisma.document.findFirst({
      where: { id, userId },
    });
    if (!document) {
      throw ApiError.notFound('Document not found');
    }
    return document;
  },

  async createDocument(userId: string, data: CreateDocumentInput) {
    const doc = await prisma.document.create({
      data: {
        ...data,
        userId,
      },
    });
    syncUserToCustomer(userId).catch(console.error);
    return doc;
  },

  async updateDocument(userId: string, id: string, data: UpdateDocumentInput) {
    const document = await this.getDocumentById(userId, id);
    const updatedDoc = await prisma.document.update({
      where: { id: document.id },
      data,
    });
    syncUserToCustomer(userId).catch(console.error);
    return updatedDoc;
  },

  async deleteDocument(userId: string, id: string) {
    const document = await this.getDocumentById(userId, id);
    await prisma.document.delete({
      where: { id: document.id },
    });
    syncUserToCustomer(userId).catch(console.error);
    return { success: true };
  },
};
