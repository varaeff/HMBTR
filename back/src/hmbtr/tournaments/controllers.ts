import { Request, Response } from "express";
import pool from "../../db";
import {
  getTournamentsQuery,
  getTournamentQuery,
  checkTournamentQuery,
  addTournamentQuery,
} from "./queries";
import { QueryResult } from "pg";

const getTournaments = (req: Request, res: Response) => {
  pool.query(getTournamentsQuery, (error, results) => {
    if (error) throw error;
    res.status(200).json(results.rows);
  });
};

const getTournament = (req: Request, res: Response) => {
  const id: number = parseInt(req.params.id);

  pool.query(getTournamentQuery, [id], (error, results) => {
    if (error) throw error;
    res.status(200).json(results.rows);
  });
};

const checkTournamentExists = async (
  name: string,
  event_date: Date,
  city_id: number
) => {
  const values = [name, event_date, city_id];

  const result: QueryResult<any> = await pool.query(
    checkTournamentQuery,
    values
  );
  return result.rows[0].exists;
};

const addTournament = async (req: Request, res: Response) => {
  const { name, event_date, country_id, city_id } = req.body;

  try {
    const exists: boolean = await checkTournamentExists(
      name,
      event_date,
      city_id
    );

    if (exists) {
      throw new Error("Такой турнир уже существует");
    }

    const values = [name, event_date, country_id, city_id];

    pool.query(addTournamentQuery, values, (error, results) => {
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

export { getTournaments, getTournament, addTournament };
