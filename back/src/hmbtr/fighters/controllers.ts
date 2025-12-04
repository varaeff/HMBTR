import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

const getFighters = async (req: Request, res: Response) => {
  try {
    const fighters = await prisma.fighters.findMany();
    res.status(200).json(fighters);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch fighters" });
  }
};

const getFighter = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const fighter = await prisma.fighters.findUnique({
      where: { id },
    });

    if (!fighter) {
      return res.status(404).json({ error: "Fighter not found" });
    }

    res.status(200).json(fighter);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch fighter" });
  }
};

const checkFighterExists = async (
  name: string,
  surname: string,
  country_id: number
) => {
  const fighter = await prisma.fighters.findFirst({
    where: {
      name,
      surname,
      country_id,
    },
    select: { id: true },
  });

  return !!fighter;
};

const addFighter = async (req: Request, res: Response) => {
  const {
    name,
    surname,
    patronymic,
    birthday,
    country_id,
    city_id,
    club_id,
    pic,
  } = req.body;

  try {
    const exists = await checkFighterExists(name, surname, country_id);

    if (exists) {
      throw new Error("Такой боец уже существует");
    }

    const fighter = await prisma.fighters.create({
      data: {
        name,
        surname,
        patronymic,
        birthday: new Date(birthday),
        country_id,
        city_id,
        club_id,
        pic,
      },
    });

    res.status(201).json(fighter);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

export { getFighters, getFighter, addFighter };
