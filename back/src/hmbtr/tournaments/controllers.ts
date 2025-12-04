import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

const getTournaments = async (req: Request, res: Response) => {
  try {
    const tournaments = await prisma.tournaments.findMany();
    res.status(200).json(tournaments);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

const getTournament = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const tournament = await prisma.tournaments.findUnique({
      where: { id },
    });

    if (!tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    res.status(200).json(tournament);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tournament" });
  }
};

const checkTournamentExists = async (
  name: string,
  event_date: Date | null,
  city_id: number
) => {
  const tournament = await prisma.tournaments.findFirst({
    where: {
      name,
      event_date,
      city_id,
    },
    select: { id: true },
  });

  return !!tournament;
};

const addTournament = async (req: Request, res: Response) => {
  const { name, event_date, country_id, city_id } = req.body;

  try {
    if (!name || !country_id || !city_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exists = await checkTournamentExists(
      name,
      event_date ? new Date(event_date) : null,
      city_id
    );

    if (exists) {
      return res.status(400).json({ error: "Tournament already exists" });
    }

    const tournament = await prisma.tournaments.create({
      data: {
        name,
        event_date: event_date ? new Date(event_date) : null,
        country_id,
        city_id,
      },
    });

    res.status(201).json(tournament);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

export { getTournaments, getTournament, addTournament };
