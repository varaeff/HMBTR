import { Request, Response } from "express";
import { prisma } from "@/prismaClient";

const getCountries = async (req: Request, res: Response) => {
  try {
    const countries = await prisma.countries.findMany();
    res.status(200).json(countries);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

const getCountry = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id);

  try {
    const country = await prisma.countries.findUnique({
      where: { id },
    });

    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }

    res.status(200).json(country);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch country" });
  }
};

const checkCountryExists = async (name: string) => {
  const country = await prisma.countries.findFirst({
    where: { name },
    select: { id: true },
  });

  return !!country;
};

const addCountry = async (req: Request, res: Response) => {
  const { name } = req.body;

  try {
    const exists = await checkCountryExists(name);

    if (exists) {
      return res.status(400).json({ error: "Country already exists" });
    }

    const country = await prisma.countries.create({
      data: { name },
    });

    res.status(201).json(country);
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Unknown error" });
    }
  }
};

export { getCountries, getCountry, addCountry };
