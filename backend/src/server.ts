// backend\src\server.ts
import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { synchronizer } from './core/synchronizer.js';
import { PrismaClient } from '@prisma/client';
import { getNeo4jDriver, checkNeo4jConnection } from './infrastructure/neo4j.js';
import { initS3, checkMinioConnection, minioClient } from './infrastructure/s3.js';

const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

// РЕГИСТРАЦИЯ ПЛАГИНОВ (Всегда в начале)
fastify.register(cors, { 
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});
fastify.register(multipart);

// Эндпоинт для загрузки файлов
fastify.post('/api/entities/:id/upload', async (request, reply) => {
  const data = await request.file();
  const { id } = request.params as { id: string };

  if (!data) return reply.status(400).send({ error: 'No file uploaded' });

  // ВАЖНО: бакет должен совпадать с тем, что создается в initS3
  const bucketName = 'edge-storage'; 
  const fileName = `${Date.now()}-${data.filename}`; // Добавляем timestamp для уникальности

  try {
    // 1. Загружаем в MinIO
    await minioClient.putObject(bucketName, fileName, data.file);

    // 2. Обновляем JSON в Postgres (Безопасный метод для Json)
    const entity = await prisma.entity.findUnique({ where: { id } });
    const currentAttachments = Array.isArray(entity?.attachments) ? entity.attachments : [];
    
    const newAttachment = { 
      name: data.filename, 
      s3Key: fileName, 
      type: data.mimetype,
      uploadedAt: new Date()
    };

    const updated = await prisma.entity.update({
      where: { id },
      data: {
        attachments: [...currentAttachments, newAttachment]
      }
    });

    return { success: true, attachments: updated.attachments };
  } catch (error: any) {
    return reply.status(500).send({ error: error.message });
  }
});


// Создание сущности
fastify.post('/api/entities', async (request, reply) => {
  const { type, domain, data } = request.body as any;
  try {
    const result = await synchronizer.createEntity(type, domain, data);
    return { success: true, entity: result };
  } catch (error: any) {
    reply.status(500).send({ success: false, error: error.message });
  }
});

// Получение графа
fastify.get('/api/graph', async (request, reply) => {
  try {
    const graphData = await synchronizer.getGraphData();
    return graphData;
  } catch (error: any) {
    reply.status(500).send({ error: error.message });
  }
});

async function start() {
  try {
    // Сначала подключаем базы
    await prisma.$connect();
    await checkNeo4jConnection();
    
    const isMinioOk = await checkMinioConnection();
    if (isMinioOk) await initS3();

    // Только потом запускаем сервер
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Edge Core Engine запущен на http://localhost:4000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
