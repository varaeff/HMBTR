import { Request, Response } from "express";
import { prisma } from "@/prismaClient";
import { withErrorHandling } from "@/wrappers/withErrorHandling";

const getClubs = withErrorHandling(
  async (req: Request, res: Response) => {
    const city_id = Number(req.params.id);

    const clubs = await prisma.clubs.findMany({
      where: { city_id },
    });
    res.status(200).json(clubs);
  },
  { params: { id: "number" } }
);

const getClub = withErrorHandling(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const club = await prisma.clubs.findUnique({
      where: { id },
    });

    if (!club) {
      res.status(404).json({ error: "Club not found" });
      return;
    }

    res.status(200).json(club);
  },
  { params: { id: "number" } }
);

const checkClubExists = async (name: string, city_id: number) => {
  const club = await prisma.clubs.findFirst({
    where: { name, city_id },
    select: { id: true },
  });

  return !!club;
};

const addClub = withErrorHandling(
  async (req: Request, res: Response) => {
    const { name, city_id } = req.body;

    const exists = await checkClubExists(name, city_id);

    if (exists) {
      res.status(400).json({ error: "Club already exists" });
      return;
    }

    const club = await prisma.clubs.create({
      data: { name, city_id },
    });

    res.status(201).json(club);
  },
  { body: { name: "string", city_id: "number" } }
);

export { getClubs, getClub, addClub };
