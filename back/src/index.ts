import express, { Express, Request, Response } from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import cors from "cors";
import router from "@/hmbtr/routes";
import loggerMiddleware from "@/middlewares/logger";
// import { execSync } from "child_process";

dotenv.config();

const app: Express = express();
const port = process.env.APP_PORT;

// async function ensureDatabaseSchema() {
//   console.log("🔄 Checking database schema...");

//   try {
//     execSync("npx prisma migrate deploy", { stdio: "inherit" });
//     console.log("✅ Database schema is up to date");
//   } catch (err) {
//     console.error("❌ Error checking/applying database schema:");
//     console.error(err);
//   }
// }

// ensureDatabaseSchema();

app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));
app.use(loggerMiddleware);
app.use("/api/hmbtr/v1", router);

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running");
});

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
