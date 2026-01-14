import { Request, Response } from "express";
import { prisma } from "@/prismaClient";

const getClubs = async (req: Request, res: Response) => {
  const city_id = parseInt(req.params.id);

  try {
    const clubs = await prisma.clubs.findMany({
      where: { city_id },
    });
    res.status(200).json(clubs);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

const getClub = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const club = await prisma.clubs.findUnique({
      where: { id },
    });

    if (!club) {
      return res.status(404).json({ error: "Club not found" });
    }

    res.status(200).json(club);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch club" });
  }
};

const checkClubExists = async (name: string, city_id: number) => {
  const city = await prisma.clubs.findFirst({
    where: { name, city_id },
    select: { id: true },
  });

  return !!city;
};

const addClub = async (req: Request, res: Response) => {
  const { name, city_id } = req.body;

  try {
    if (!name || !city_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exists = await checkClubExists(name, city_id);

    if (exists) {
      return res.status(400).json({ error: "Club already exists" });
    }

    const club = await prisma.clubs.create({
      data: { name, city_id },
    });

    res.status(201).json(club);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

export { getClubs, getClub, addClub };
