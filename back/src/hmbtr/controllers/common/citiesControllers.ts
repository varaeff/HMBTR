import { Request, Response } from "express";
import { prisma } from "@/prismaClient";
import { withErrorHandling } from "@/wrappers/withErrorHandling";
import { citySchema } from "./commonSchemas";

const getCities = withErrorHandling(
  async (req: Request, res: Response) => {
    const country_id = parseInt(req.params.id);

    const cities = await prisma.cities.findMany({
      where: { country_id },
    });
    res.status(200).json(cities);
  },
  { params: { id: "number" } },
);

const getCity = withErrorHandling(
  async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);

    const city = await prisma.cities.findUnique({
      where: { id },
    });

    if (!city) {
      res.status(404).json({ error: "City not found" });
      return;
    }

    res.status(200).json(city);
  },
  { params: { id: "number" } },
);

const checkCityExists = async (name: string, country_id: number) => {
  const city = await prisma.cities.findFirst({
    where: { name, country_id },
    select: { id: true },
  });

  return !!city;
};

const addCity = withErrorHandling(
  async (req: Request, res: Response) => {
    const { name, country_id } = req.body;
    const exists = await checkCityExists(name, country_id);

    if (exists) {
      res.status(400).json({ error: "City already exists" });
      return;
    }

    const city = await prisma.cities.create({
      data: { name, country_id },
    });

    res.status(201).json(city);
  },
  { bodySchema: citySchema },
);

export { getCities, getCity, addCity };
