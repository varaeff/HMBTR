import { Request, Response } from "express";
import { prisma } from "@/prismaClient";
import { withErrorHandling } from "@/wrappers/withErrorHandling";
import { countrySchema } from "./commonSchemas";

const getCountries = withErrorHandling(async (req: Request, res: Response) => {
  const countries = await prisma.countries.findMany();
  res.status(200).json(countries);
});

const getCountry = withErrorHandling(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const country = await prisma.countries.findUnique({
      where: { id },
    });

    if (!country) {
      res.status(404).json({ error: "Country not found" });
      return;
    }

    res.status(200).json(country);
  },
  { params: { id: "number" } },
);

const checkCountryExists = async (name: string) => {
  const country = await prisma.countries.findFirst({
    where: { name },
    select: { id: true },
  });

  return !!country;
};

const addCountry = withErrorHandling(
  async (req: Request, res: Response) => {
    const { name } = req.body;

    const exists = await checkCountryExists(name);

    if (exists) {
      res.status(400).json({ error: "Country already exists" });
      return;
    }

    const country = await prisma.countries.create({
      data: { name },
    });

    res.status(201).json(country);
  },
  { bodySchema: countrySchema },
);

export { getCountries, getCountry, addCountry };
