import neo4j, { Driver } from 'neo4j-driver';

let driver: Driver;

export const getNeo4jDriver = () => {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      )
    );
  }
  return driver;
};

// Функция для проверки соединения
export const checkNeo4jConnection = async () => {
  const drv = getNeo4jDriver();
  try {
    await drv.verifyConnectivity();
    console.log('[v] Neo4j: Connection established');
    return true;
  } catch (error) {
    console.error('[x] Neo4j: Connection failed', error);
    return false;
  }
};