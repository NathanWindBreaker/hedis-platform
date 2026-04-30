// src\core\synchronizer.ts

import { PrismaClient } from '@prisma/client';
import { getNeo4jDriver } from '../infrastructure/neo4j.js';

const prisma = new PrismaClient();

export class DataSynchronizer {
  /**
   * Создает универсальную сущность сразу в двух базах
   */
  async createEntity(typeName: string, domain: string, data: any) {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // 1. Сначала подготавливаем или находим тип в Postgres
      const entityType = await prisma.entityType.upsert({
        where: { name: typeName },
        update: {},
        create: {
          name: typeName,
          domain: domain,
          schema: {}, // Здесь позже будет валидация
        },
      });

      // 2. Пишем в PostgreSQL (Основное хранилище атрибутов)
      const newEntity = await prisma.entity.create({
        data: {
          typeId: entityType.id,
          data: data,
          attachments: [],
        },
      });

      // 3. Пишем в Neo4j (Графовое хранилище связей)
      // Используем тот же ID, что выдал Postgres
      await session.run(
        `CREATE (n:${typeName} {id: $id}) SET n += $props RETURN n`,
        {
          id: newEntity.id,
          props: data, // Дублируем важные атрибуты в граф для поиска
        }
      );

      console.log(`[v] Entity ${newEntity.id} синхронизирована [SQL + Graph]`);
      return newEntity;

    } catch (error) {
      console.error('[x] Ошибка синхронизации:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Создает связь между двумя сущностями в графе
   */
  async createRelation(fromId: string, toId: string, relationType: string) {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      await session.run(
        `MATCH (a), (b) 
         WHERE a.id = $fromId AND b.id = $toId 
         CREATE (a)-[r:${relationType}]->(b) 
         RETURN r`,
        { fromId, toId }
      );
      console.log(`[=] Связь [${relationType}] установлена между ${fromId} и ${toId}`);
    } finally {
      await session.close();
    }
  }


  async getGraphData() {
    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      const result = await session.run(`
        MATCH (n)
        OPTIONAL MATCH (n)-[r]->(m)
        RETURN n, r, m
      `);

      const nodes = new Map();
      const edges: any[] = [];

      result.records.forEach(record => {
        const n = record.get('n');
        const r = record.get('r');
        const m = record.get('m');

        const processNode = (node: any) => {
          if (!node) return;
          const id = node.properties.id;
          if (!nodes.has(id)) {
            nodes.set(id, {
              data: {
                id: id,
                // Используем name, title или просто тип узла для отображения
                label: node.properties.name || node.properties.title || node.labels[0] || 'Unknown',
                type: node.labels[0],
                ...node.properties // Передаем все свойства для тултипов на фронте
              }
            });
          }
        };

        processNode(n);
        processNode(m);

        if (n && m && r) {
          edges.push({
            data: {
              id: r.identity.toString(), // ID связи
              source: n.properties.id,
              target: m.properties.id,
              label: r.type
            }
          });
        }
      });

      return {
        elements: {
          nodes: Array.from(nodes.values()),
          edges: edges
        }
      };
    } catch (error) {
      console.error('[x] Neo4j Fetch Error:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

}

export const synchronizer = new DataSynchronizer();