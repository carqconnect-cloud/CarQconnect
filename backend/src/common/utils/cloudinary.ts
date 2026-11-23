import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadOptions {
  resourceType?: 'image' | 'raw' | 'video' | 'auto';
  publicId?: string;
  overwrite?: boolean;
}

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string,
  options?: CloudinaryUploadOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: options?.resourceType || 'auto',
        ...(options?.publicId ? { public_id: options.publicId } : {}),
        ...(options?.overwrite !== undefined ? { overwrite: options.overwrite } : {}),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    uploadStream.end(fileBuffer);
  });
};
