import type { RequestHandler } from "express";
import { NotFoundError } from "../errors/index.js";

/** Forward unmatched routes through the same error formatter as controller failures. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new NotFoundError("The requested route was not found"));
};
