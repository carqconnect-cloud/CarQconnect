const cloudinary = require('cloudinary').v2;
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function main() {
  console.log('Testing Cloudinary configuration...');
  console.log('Cloud name:', process.env.CLOUDINARY_CLOUD_NAME);

  const ping = await cloudinary.api.ping();
  console.log('Cloudinary ping status:', ping.status);

  const modelsDir = path.resolve(__dirname, '../../app/assets/models');
  const originalGlb = path.join(modelsDir, 'Car 3d Model.glb');
  const optimizedGlb = path.join(modelsDir, 'car_optimized.glb');

  console.log('Checking model files:');
  if (fs.existsSync(originalGlb)) {
    const stats = fs.statSync(originalGlb);
    console.log(`- Car 3d Model.glb exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log('- Car 3d Model.glb does NOT exist');
  }

  if (fs.existsSync(optimizedGlb)) {
    const stats = fs.statSync(optimizedGlb);
    console.log(`- car_optimized.glb exists (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log('- car_optimized.glb does NOT exist');
  }

  // 1. Upload car_optimized.glb first
  if (fs.existsSync(optimizedGlb)) {
    console.log('\n[1/2] Uploading car_optimized.glb to Cloudinary (resource_type: raw)...');
    const optResult = await cloudinary.uploader.upload(optimizedGlb, {
      resource_type: 'raw',
      folder: 'models',
      public_id: 'car_optimized.glb',
      overwrite: true,
    });
    console.log('Uploaded car_optimized.glb successfully!');
    console.log('Secure URL:', optResult.secure_url);
  }

  // 2. Upload original Car 3d Model.glb (35.8 MB)
  if (fs.existsSync(originalGlb)) {
    console.log('\n[2/2] Uploading "Car 3d Model.glb" to Cloudinary (resource_type: raw)...');
    const origResult = await cloudinary.uploader.upload(originalGlb, {
      resource_type: 'raw',
      folder: 'models',
      public_id: 'car_3d_model.glb',
      overwrite: true,
    });
    console.log('Uploaded Car 3d Model.glb successfully!');
    console.log('Secure URL:', origResult.secure_url);
  }

  console.log('\nAll uploads completed successfully!');
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
