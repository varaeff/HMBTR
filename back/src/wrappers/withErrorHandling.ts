import { Request, Response } from "express";
import { ZodType } from "zod";

type AsyncController<TBody> = (
  req: Request<Record<string, string>, any, TBody>,
  res: Response,
) => Promise<void>;

type ParamsValidator = Record<string, "number" | "string">;

const withErrorHandling =
  <TBody>(
    controller: AsyncController<TBody>,
    options?: {
      bodySchema?: ZodType<TBody>;
      params?: ParamsValidator;
    },
  ) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // --- Валидация params ---
      if (options?.params) {
        for (const key in options.params) {
          const type = options.params[key];
          const value = req.params[key];

          if (
            value === undefined ||
            (type === "number" && isNaN(Number(value))) ||
            (type === "string" && value.trim() === "")
          ) {
            res.status(400).json({ error: `Invalid param: ${key}` });
            return;
          }
        }
      }

      // --- Валидация body ---
      if (options?.bodySchema) {
        const result = options.bodySchema.safeParse(req.body);

        if (!result.success) {
          res.status(400).json({
            error: "Invalid request body",
            details: result.error.flatten(),
          });
          return;
        }

        req.body = result.data;
      }

      // --- основной контроллер ---
      await controller(req as Request<any, any, TBody>, res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Unknown error" });
      }
    }
  };

export { withErrorHandling };
