import { Request, Response } from "express";
import { prisma } from "@/prismaClient";
import { withErrorHandling } from "@/wrappers/withErrorHandling";
import { tournamentSchema } from "./mainSchemas";

const getTournaments = withErrorHandling(
  async (req: Request, res: Response) => {
    const tournaments = await prisma.tournaments.findMany();
    res.status(200).json(tournaments);
  },
);

const getTournament = withErrorHandling(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const tournament = await prisma.tournaments.findUnique({
      where: { id },
    });

    if (!tournament) {
      res.status(404).json({ error: "Tournament not found" });
      return;
    }

    res.status(200).json(tournament);
  },
  { params: { id: "number" } },
);

const checkTournamentExists = async (
  name: string,
  event_date: Date | null,
  city_id: number,
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

const addTournament = withErrorHandling(
  async (req: Request, res: Response) => {
    const { name, event_date, country_id, city_id } = req.body;

    const exists = await checkTournamentExists(
      name,
      event_date ? new Date(event_date) : null,
      city_id,
    );

    if (exists) {
      res.status(400).json({ error: "Tournament already exists" });
      return;
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
  },
  {
    bodySchema: tournamentSchema,
  },
);

export { getTournaments, getTournament, addTournament };
