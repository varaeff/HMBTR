import pool from "./db";
import { createTableFightersQuery } from "./hmbtr/fighters/queries";
import {
  tableCheckQuery,
  createTableCountriesQuery,
  createTableCitiesQuery,
  createTableClubsQuery,
  initTableCountriesQuery,
  initTableCitiesQuery,
  initTableClubsQuery,
} from "./hmbtr/common/queries";

const createTable = async (
  tableName: string,
  createQuery: string,
  initQuery?: string
): Promise<void> => {
  const client = await pool.connect();
  try {
    const result = await client.query(tableCheckQuery, [tableName]);
    const exists = result.rows[0].exists;

    if (!exists) {
      await client.query(createQuery);
      if (initQuery) await client.query(initQuery);
      console.log(`Table ${tableName} created successfully.`);
    }
  } catch (error) {
    console.error(`Error creating table ${tableName}:`, error);
  } finally {
    client.release();
  }
};

const initDB = async (): Promise<void> => {
  await createTable("fighters", createTableFightersQuery);
  await createTable(
    "countries",
    createTableCountriesQuery,
    initTableCountriesQuery
  );
  await createTable("cities", createTableCitiesQuery, initTableCitiesQuery);
  await createTable("clubs", createTableClubsQuery, initTableClubsQuery);
};

export default initDB;
