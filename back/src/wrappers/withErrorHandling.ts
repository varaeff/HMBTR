import { Request, Response } from "express";

type AsyncController = (req: Request, res: Response) => Promise<void>;

type ParamValidators = {
  params?: Record<string, "number" | "string">;
  body?: Record<string, "number" | "string">;
};

const withErrorHandling =
  (controller: AsyncController, validators?: ParamValidators) =>
  async (req: Request, res: Response): Promise<void> => {
    try {
      // --- Валидация params ---
      if (validators?.params) {
        for (const key in validators.params) {
          const type = validators.params[key];
          const value = req.params[key];

          if (!value || (type === "number" && isNaN(Number(value)))) {
            res.status(400).json({ error: `Invalid param: ${key}` });
            return;
          }
        }
      }

      // --- Валидация body ---
      if (validators?.body) {
        for (const key in validators.body) {
          const type = validators.body[key];
          const value = req.body[key];

          if (
            value === undefined ||
            (type === "number" && isNaN(Number(value))) ||
            (type === "string" && value.trim() === "")
          ) {
            res.status(400).json({ error: `Missing or invalid field: ${key}` });
            return;
          }
        }
      }

      // --- основной контроллер ---
      await controller(req, res);
    } catch (error) {
      if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Unknown error" });
      }
    }
  };

export { withErrorHandling };
