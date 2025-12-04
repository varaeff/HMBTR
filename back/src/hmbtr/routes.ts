import { Router } from "express";
import { getFighters, getFighter, addFighter } from "./fighters/controllers";
import {
  getCountries,
  getCountry,
  addCountry,
  getCities,
  getCity,
  addCity,
  getClubs,
  getClub,
  addClub,
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
router.get("/country/:id", getCountry);
router.post("/countries", addCountry);

router.get("/cities/:id", getCities);
router.get("/city/:id", getCity);
router.post("/cities", addCity);

router.get("/clubs/:id", getClubs);
router.get("/club/:id", getClub);
router.post("/clubs", addClub);

export default router;
