import { describe, expect, it, vi } from "vitest";
import type { Router } from "express";
import request from "supertest";
import { z } from "zod";
vi.mock("../../src/utils/prisma.js", () => ({ prisma: {} }));
import apiRouter from "../../src/routes/app-route.js";
import { createApp } from "../../src/app.js";
import { apiContracts } from "../../src/docs/api-contracts.js";
import { __DOCS_BUILD_IMPORTS__ } from "../../src/utils/openapi.js";
__ROUTER_TEST_IMPORTS__

// Inspect Express's registered routes so edits cannot silently omit API exports.
const layerSchema = z.object({
  route: z.object({ path: z.string(), methods: z.record(z.string(), z.boolean()) }).optional(),
});
const groups: [string, Router][] = [__ROUTER_TEST_GROUPS__];
describe("API export contracts", () => {
  it("documents every registered method and path exactly once", () => {
    const actual = groups.flatMap(([prefix, router]) =>
      z
        .array(layerSchema)
        .parse(router.stack)
        .flatMap(({ route }) =>
          route
            ? Object.entries(route.methods)
                .filter(([, enabled]) => enabled)
                .map(([method]) => `${method} ${prefix}${route.path === "/" ? "" : route.path}`)
            : [],
        ),
    );
    const documented = apiContracts.map(({ method, path }) => `${method} ${path}`);
    expect(documented.sort()).toEqual(actual.sort());
    expect(new Set(documented).size).toBe(documented.length);
    expect(new Set(apiContracts.map(({ operationId }) => operationId)).size).toBe(
      apiContracts.length,
    );
    const mounted = z.array(z.object({ handle: z.unknown() })).parse(apiRouter.stack);
    for (const [, router] of groups)
      expect(mounted.some(({ handle }) => handle === router)).toBe(true);
  });
  it("reaches the documented paths through their mounted feature routers", async () => {
    const app = createApp();
    for (const route of apiContracts) {
      const path = `/api${route.path.replace(/:[a-zA-Z0-9_]+/g, "example-id")}`;
      const response =
        route.method === "post"
          ? await request(app).post(path).send({})
          : route.method === "patch"
            ? await request(app).patch(path).send({})
            : route.method === "delete"
              ? await request(app).delete(path).send({})
              : await request(app).get(path);
      expect(response.body.errorCode, `${route.method} ${path}`).not.toBe("NOT_FOUND");
      expect(response.status).not.toBe(500);
      if (route.access !== "public") expect(response.status).toBe(401);
    }
  });
  it("exports the selected formats deterministically", () => {
    __DOCS_TEST_ASSERTIONS__
  });
});
