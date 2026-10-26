import { BadRequestError, CustomAPIError, ERROR_CODES } from "../errors/index.js";
import type { Request, RequestHandler } from "express";
import type { z } from "zod";

type Location = "body" | "query" | "params";
interface ParsedValue {
  schema: z.ZodType;
  value: unknown;
}
const parsedRequests = new WeakMap<Request, Map<Location, ParsedValue>>();

/** Preserve parsed values separately because Express 5 query parameters are read-only. */
export function validateRequest(schemas: {
  body?: z.ZodType;
  query?: z.ZodType;
  params?: z.ZodType;
}): RequestHandler {
  return (req, _res, next) => {
    req.validated ??= {};
    const parsed = parsedRequests.get(req) ?? new Map<Location, ParsedValue>();
    parsedRequests.set(req, parsed);
    for (const location of ["body", "query", "params"] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = schema.safeParse(req[location]);
      if (!result.success)
        throw new BadRequestError(
          "Please check the submitted information",
          ERROR_CODES.VALIDATION_ERROR,
          result.error.issues.map((issue) => ({
            path: `${location}.${issue.path.join(".")}`,
            message: issue.message,
          })),
        );
      req.validated[location] = result.data;
      parsed.set(location, { schema, value: result.data });
    }
    next();
  };
}

/** Validate and retain body values for the controller. */
export function validateBody(schema: z.ZodType): RequestHandler {
  return validateRequest({ body: schema });
}
/** Parse query values without overwriting Express 5's read-only query property. */
export function validateQuery(schema: z.ZodType): RequestHandler {
  return validateRequest({ query: schema });
}
/** Validate route identifiers before reaching the controller. */
export function validateParams(schema: z.ZodType): RequestHandler {
  return validateRequest({ params: schema });
}

/** Read only output produced by the exact schema installed on this request/location. */
function readValidated<S extends z.ZodType>(
  req: Request,
  location: Location,
  schema: S,
): z.output<S> {
  const parsed = parsedRequests.get(req)?.get(location);
  if (!parsed || parsed.schema !== schema)
    throw new CustomAPIError("Something went wrong. Please try again later");
  // This single assertion is protected by schema identity and the private cache populated by safeParse.
  // Do not parse again: transforms may not be idempotent and should execute only once.
  return parsed.value as z.output<S>;
}
/** Retrieve the body validated by the route's named schema. */
export function validatedBody<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  return readValidated(req, "body", schema);
}
/** Retrieve parsed query values, including coerced numbers and defaults. */
export function validatedQuery<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  return readValidated(req, "query", schema);
}
/** Retrieve validated route identifiers without assuming middleware ran. */
export function validatedParams<S extends z.ZodType>(req: Request, schema: S): z.output<S> {
  return readValidated(req, "params", schema);
}
