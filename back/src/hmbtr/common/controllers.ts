import { Request, Response } from "express";
import pool from "../../db";
import {
  getCountriesQuery,
  getDataByIdQuery,
  checkCountryQuery,
  checkDataQuery,
  addCountryQuery,
  addDataQuery,
} from "./queries";
import { QueryResult } from "pg";

const getCountries = (req: Request, res: Response) => {
  pool.query(getCountriesQuery, (error, results) => {
    if (error) throw error;
    res.status(200).json(results.rows);
  });
};

const getData = (table: string, column: string) => {
  return async (req: Request, res: Response) => {
    const id: number = parseInt(req.params.id);

    pool.query(getDataByIdQuery(table, column), [id], (error, results) => {
      if (error) throw error;
      res.status(200).json(results.rows);
    });
  };
};

const checkCountryExists = async (name: string) => {
  const result: QueryResult<any> = await pool.query(checkCountryQuery, [name]);
  return result.rows[0].exists;
};

const checkDataExists = async (
  table: string,
  column: string,
  name: string,
  id: number
) => {
  const result: QueryResult<any> = await pool.query(
    checkDataQuery(table, column),
    [name, id]
  );
  return result.rows[0].exists;
};

const addCountry = async (req: Request, res: Response) => {
  const { name } = req.body;

  try {
    const exists: boolean = await checkCountryExists(name);

    if (exists) {
      return res.status(400).json({ error: "Country already exists" });
    }

    pool.query(addCountryQuery, [name], (error, results) => {
      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }
      res.status(201).json(results.rows[0]);
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

const addData = (table: string, column: string) => {
  return async (req: Request, res: Response) => {
    const { name, id } = req.body;

    try {
      const exists: boolean = await checkDataExists(table, column, name, id);
      const output = table === "cities" ? "City" : "Club";

      if (exists) {
        return res.status(400).json({ error: `${output} already exists` });
      }

      pool.query(addDataQuery(table, column), [name, id], (error, results) => {
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.status(201).json(results.rows[0]);
      });
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Unknown error" });
      }
    }
  };
};

export { getCountries, getData, addCountry, addData };
