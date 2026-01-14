import { Router } from "express";
import {
  getFighters,
  getFighter,
  addFighter,
} from "./controllers/main/fightersControllers";
import {
  getCountries,
  getCountry,
  addCountry,
} from "./controllers/common/countriesControllers";
import {
  getCities,
  getCity,
  addCity,
} from "./controllers/common/citiesControllers";
import {
  getClubs,
  getClub,
  addClub,
} from "./controllers/common/clubsControllers";
import {
  addTournament,
  getTournament,
  getTournaments,
} from "./controllers/main/tournamentsControllers";

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
