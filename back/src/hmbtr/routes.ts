import { Router } from "express";
import { getFighters, getFighter, addFighter } from "./fighters/controllers";
import {
  getCountries,
  getData,
  addCountry,
  addData,
} from "./common/controllers";
import {
  addTournament,
  getTournament,
  getTournaments,
} from "./tournaments/controllers";

const router = Router();

router.get("/fighters", getFighters);
router.get("/fighter/:id", getFighter);
router.post("/fighters", addFighter);

router.get("/tournaments", getTournaments);
router.get("/tournament/:id", getTournament);
router.post("/tournaments", addTournament);

router.get("/countries", getCountries);
router.get("/country/:id", getData("countries", "id"));
router.post("/countries", addCountry);

router.get("/cities/:id", getData("cities", "country_id"));
router.get("/city/:id", getData("cities", "id"));
router.post("/cities", addData("cities", "country_id"));

router.get("/clubs/:id", getData("clubs", "city_id"));
router.get("/club/:id", getData("clubs", "id"));
router.post("/clubs", addData("clubs", "city_id"));

export default router;
