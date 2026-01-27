import { z } from "zod";

const fighterSchema = z.object({
  name: z.string().min(1).max(100),
  surname: z.string().min(1).max(100),
  patronymic: z.string().optional(),
  birthday: z
    .string()
    .optional()
    .refine((d) => !d || !isNaN(Date.parse(d)), {
      message: "Invalid birthday",
    }),
  country_id: z.number(),
  city_id: z.number(),
  club_id: z.number().optional(),
  pic: z.string().optional(),
});

const tournamentSchema = z.object({
  name: z.string().min(1).max(200),
  event_date: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), { message: "Invalid event date" }),
  country_id: z.number(),
  city_id: z.number(),
});

export { fighterSchema, tournamentSchema };
