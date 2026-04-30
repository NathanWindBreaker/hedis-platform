import Fastify from 'fastify';
import cors from '@fastify/cors';
import { synchronizer } from './core/synchronizer.js';
import { PrismaClient } from '@prisma/client';
import { getNeo4jDriver, checkNeo4jConnection } from './infrastructure/neo4j.js';
import { initS3, checkMinioConnection } from './infrastructure/s3.js'; // Добавили S3


const fastify = Fastify({ logger: true });
const prisma = new PrismaClient();

fastify.register(cors, { 
  origin: "*",
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});


// Эндпоинт 1: Создание сущности
fastify.post('/api/entities', async (request, reply) => {
  const { type, domain, data } = request.body as any;
  try {
    const result = await synchronizer.createEntity(type, domain, data);
    return { success: true, entity: result };
  } catch (error: any) {
    reply.status(500).send({ success: false, error: error.message });
  }
});

// Эндпоинт 2: Получение графа
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
    await fastify.ready();
    // 1. Проверка Postgres
    await prisma.$connect();
    console.log('[v] Postgres: Connected');

    // 2. Проверка Neo4j
    await checkNeo4jConnection();
    console.log('[v] Neo4j: Connected');

    // 3. Проверка и инициализация MinIO (S3)
    const isMinioOk = await checkMinioConnection();
    if (isMinioOk) {
      await initS3();
    } else {
      console.warn('[!] MinIO недоступен, функции S3 будут ограничены');
    }

    // Запуск сервера
    await fastify.listen({ port: 4000, host: '0.0.0.0' });
    console.log('Edge Core Engine запущен на http://localhost:4000');

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Корректное завершение работы при выключении
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    await fastify.close();
    await prisma.$disconnect();
    await getNeo4jDriver().close();
    process.exit(0);
  });
});

start();
