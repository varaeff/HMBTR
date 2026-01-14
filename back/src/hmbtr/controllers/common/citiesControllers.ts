import { Request, Response } from "express";
import { prisma } from "@/prismaClient";

const getCities = async (req: Request, res: Response) => {
  const country_id = parseInt(req.params.id);

  try {
    const cities = await prisma.cities.findMany({
      where: { country_id },
    });
    res.status(200).json(cities);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

const getCity = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const city = await prisma.cities.findUnique({
      where: { id },
    });

    if (!city) {
      return res.status(404).json({ error: "City not found" });
    }

    res.status(200).json(city);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch city" });
  }
};

const checkCityExists = async (name: string, country_id: number) => {
  const city = await prisma.cities.findFirst({
    where: { name, country_id },
    select: { id: true },
  });

  return !!city;
};

const addCity = async (req: Request, res: Response) => {
  const { name, country_id } = req.body;

  try {
    if (!name || !country_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const exists = await checkCityExists(name, country_id);

    if (exists) {
      return res.status(400).json({ error: "City already exists" });
    }

    const city = await prisma.cities.create({
      data: { name, country_id },
    });

    res.status(201).json(city);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

export { getCities, getCity, addCity };
