import { z } from "zod";

const countrySchema = z.object({
  name: z.string().min(1).max(100),
});

const citySchema = z.object({
  name: z.string().min(1).max(100),
  country_id: z.number().int().positive(),
});

const clubSchema = z.object({
  name: z.string().min(1).max(100),
  city_id: z.number().int().positive(),
});

export { countrySchema, citySchema, clubSchema };
