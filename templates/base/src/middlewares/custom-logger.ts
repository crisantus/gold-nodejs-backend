import type { RequestHandler } from "express";

/** Log allowlisted completion metadata; never record bodies, tokens, queries or raw URLs. */
export const customLogger: RequestHandler = (req, res, next) => {
  const started = performance.now();
  res.once("finish", () => {
    if (process.env.NODE_ENV === "test") return;
    console.log(
      JSON.stringify({
        level: "info",
        requestId: res.locals.requestId,
        method: req.method,
        statusCode: res.statusCode,
        durationMs: Math.round(performance.now() - started),
      }),
    );
  });
  next();
};
