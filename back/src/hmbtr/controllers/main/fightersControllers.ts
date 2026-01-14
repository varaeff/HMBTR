import { Request, Response } from "express";
import { prisma } from "@/prismaClient";
import { withErrorHandling } from "@/wrappers/withErrorHandling";

const getFighters = withErrorHandling(async (req: Request, res: Response) => {
  const fighters = await prisma.fighters.findMany();
  res.status(200).json(fighters);
});

const getFighter = withErrorHandling(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const fighter = await prisma.fighters.findUnique({
      where: { id },
    });

    if (!fighter) {
      res.status(404).json({ error: "Fighter not found" });
      return;
    }

    res.status(200).json(fighter);
  },
  { params: { id: "number" } }
);

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

const addFighter = withErrorHandling(
  async (req: Request, res: Response) => {
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

    const exists = await checkFighterExists(name, surname, country_id);

    if (exists) {
      res.status(400).json({ error: "Fighter already exists" });
      return;
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
  },
  {
    body: {
      name: "string",
      surname: "string",
      patronymic: "string",
      birthday: "string",
      country_id: "number",
      city_id: "number",
      club_id: "number",
      pic: "string",
    },
  }
);

export { getFighters, getFighter, addFighter };
