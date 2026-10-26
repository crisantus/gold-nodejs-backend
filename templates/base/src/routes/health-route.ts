import { Router } from "express";
import { health, ready } from "../controllers/health.controller.js";
const router = Router();
/** Health endpoints are public so process supervisors can inspect the service. */
router.get("/health", health);
router.get("/ready", ready);
export default router;
