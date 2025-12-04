import { Request, Response } from "express";
import { prisma } from "../../prismaClient";

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

export {
  getCountries,
  getCountry,
  addCountry,
  getCities,
  getCity,
  addCity,
  getClubs,
  getClub,
  addClub,
};
