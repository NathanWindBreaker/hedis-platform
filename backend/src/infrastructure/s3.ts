import { Client } from 'minio';

export const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true', // Лучше сделать гибким
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin', // В MinIO по умолчанию minioadmin
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

export const checkMinioConnection = async () => {
  try {
    await minioClient.listBuckets();
    console.log('[v] MinIO: Connection established');
    return true;
  } catch (error) {
    console.error('[x] MinIO: Connection failed', error);
    return false;
  }
};

export const initS3 = async () => {
  try {
    const bucketName = 'edge-storage';
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      // Для MinIO локально регион 'us-east-1' можно не указывать или оставить по дефолту
      await minioClient.makeBucket(bucketName); 
      console.log(`[v] Bucket '${bucketName}' создан`);
    }
  } catch (error) {
    console.error('[x] MinIO: Initialization failed', error);
  }
};
