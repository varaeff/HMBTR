import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";

const LOG_DIR = path.resolve("@/../logs");

fs.mkdir(LOG_DIR, { recursive: true }, (err) => {
  if (err) console.error("Failed to create log directory:", err);
});

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = new Date();

  res.on("finish", () => {
    const end = new Date();
    const duration = end.getTime() - start.getTime();

    const log = {
      time: start.toISOString(),
      method: req.method,
      endpoint: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
    };

    const logLine = JSON.stringify(log) + "\n";

    const fileName = path.join(
      LOG_DIR,
      `${start.toISOString().slice(0, 10)}.log`
    );

    fs.appendFile(fileName, logLine, (err) => {
      if (err) console.error("Failed to write log:", err);
    });
  });

  next();
};

export default loggerMiddleware;
