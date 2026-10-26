import { StatusCodes } from "http-status-codes";
import { createHash } from "node:crypto";
import { z } from "zod";
import { apiContracts } from "../docs/api-contracts.js";
import { env } from "../config/env.js";

function jsonSchema(schema: z.ZodType): Record<string, unknown> {
  const { $schema: _dialect, ...definition } = z.toJSONSchema(schema, {
    unrepresentable: "any",
    io: "input",
  });
  return definition;
}
/** Treat generated JSON-schema values as unknown until their shape is checked. */
function objectValue(value: unknown): Record<string, unknown> {
  const parsed = z.record(z.string(), z.unknown()).safeParse(value);
  return parsed.success ? parsed.data : {};
}
const failure = {
  type: "object",
  required: ["status", "message", "errorCode"],
  properties: {
    status: { const: false },
    message: { type: "string" },
    errorCode: { type: "string" },
    errors: {
      type: "array",
      items: {
        type: "object",
        properties: { path: { type: "string" }, message: { type: "string" } },
      },
    },
  },
};

/** Documentation contracts reuse the schemas used by explicit Express routes. */
export function buildOpenApi() {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of apiContracts) {
    const path = `/api${route.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}")}`;
    const parameters: unknown[] = [];
    for (const location of ["query", "params"] as const) {
      const schema = route[location];
      if (!schema) continue;
      const definition = jsonSchema(schema);
      const properties = objectValue(definition.properties);
      for (const [name, value] of Object.entries(properties ?? {}))
        parameters.push({
          name,
          in: location === "params" ? "path" : "query",
          required:
            location === "params" ||
            (Array.isArray(definition.required) && definition.required.includes(name)) ||
            false,
          schema: value,
        });
    }
    const responses: Record<string, unknown> = {};
    responses[String(route.statusCode ?? StatusCodes.OK)] = {
      description: "Successful response",
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["status", "message"],
            properties: {
              status: { const: true },
              message: { type: "string" },
              data: jsonSchema(route.response),
              meta: { type: "object", additionalProperties: true },
            },
          },
        },
      },
    };
    for (const status of [
      StatusCodes.BAD_REQUEST,
      StatusCodes.UNAUTHORIZED,
      StatusCodes.FORBIDDEN,
      StatusCodes.NOT_FOUND,
      StatusCodes.CONFLICT,
      StatusCodes.REQUEST_TOO_LONG,
      StatusCodes.TOO_MANY_REQUESTS,
      StatusCodes.INTERNAL_SERVER_ERROR,
      StatusCodes.BAD_GATEWAY,
      StatusCodes.SERVICE_UNAVAILABLE,
    ])
      responses[String(status)] = {
        description: `HTTP ${status}`,
        content: { "application/json": { schema: failure } },
      };
    paths[path] ??= {};
    paths[path][route.method] = {
      operationId: route.operationId,
      tags: [route.tag],
      summary: route.summary,
      security: route.access === "public" ? [] : [{ bearerAuth: [] }, { cookieAuth: [] }],
      parameters,
      responses,
      ...(route.body
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: jsonSchema(route.body) } },
            },
          }
        : route.operationId === "uploadFile"
          ? {
              requestBody: {
                required: true,
                content: {
                  "multipart/form-data": {
                    schema: {
                      type: "object",
                      required: ["file"],
                      properties: { file: { type: "string", format: "binary" } },
                    },
                  },
                },
              },
            }
          : {}),
    };
  }
  return {
    openapi: "3.1.0",
    info: { title: __DISPLAY_NAME_JSON__, version: "0.1.0" },
    servers: [{ url: env.API_BASE_URL }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        cookieAuth: { type: "apiKey", in: "cookie", name: "accessToken" },
      },
    },
  };
}

function sample(schema: z.ZodType): unknown {
  const value = jsonSchema(schema);
  function example(s: Record<string, unknown>, key = ""): unknown {
    if ("default" in s) return s.default;
    if (s.enum && Array.isArray(s.enum)) return s.enum[0];
    if (s.type === "object")
      return Object.fromEntries(
        Object.entries(objectValue(s.properties)).map(([name, child]) => [
          name,
          example(objectValue(child), name),
        ]),
      );
    if (s.type === "array") return [];
    if (s.type === "integer" || s.type === "number") return s.minimum ?? 1;
    if (s.type === "boolean") return false;
    if (key.toLowerCase().includes("password")) return "<your-password-at-least-12-characters>";
    if (key === "email") return "user@example.com";
    if (key === "refresh_token") return "{{refreshToken}}";
    if (key === "token") return "<one-time-action-token>";
    return key === "name" ? "Example User" : "<value>";
  }
  return example(value);
}

/** Deterministic operation IDs keep request identities stable when route order changes. */
export function buildPostman() {
  const groups = new Map<string, unknown[]>();
  for (const route of apiContracts) {
    const raw = `{{baseUrl}}/api${route.path.replace(/:([a-zA-Z0-9_]+)/g, "{{$1}}")}`;
    const header: { key: string; value: string }[] = [];
    if (route.body) header.push({ key: "Content-Type", value: "application/json" });
    const query = route.query
      ? Object.entries(objectValue(sample(route.query))).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      : [];
    const request = {
      method: route.method.toUpperCase(),
      header,
      auth:
        route.access === "public"
          ? { type: "noauth" }
          : {
              type: "bearer",
              bearer: [{ key: "token", value: "{{accessToken}}", type: "string" }],
            },
      url: {
        raw: raw + (query.length ? `?${query.map((p) => `${p.key}=${p.value}`).join("&")}` : ""),
        host: ["{{baseUrl}}"],
        path: [
          "api",
          ...route.path
            .slice(1)
            .split("/")
            .map((part) => (part.startsWith(":") ? `{{${part.slice(1)}}}` : part)),
        ],
        query,
      },
      ...(route.body
        ? {
            body: {
              mode: "raw",
              raw: JSON.stringify(sample(route.body), null, 2),
              options: { raw: { language: "json" } },
            },
          }
        : route.operationId === "uploadFile"
          ? { body: { mode: "formdata", formdata: [{ key: "file", type: "file", src: [] }] } }
          : {}),
    };
    const event = ["signup", "login", "signIn", "refreshSession"].includes(route.operationId)
      ? [
          {
            listen: "test",
            script: {
              type: "text/javascript",
              exec: [
                "if (pm.response.code < 300) {",
                "  const data = pm.response.json().data || {};",
                '  if (data.access_token) pm.environment.set("accessToken", data.access_token);',
                '  if (data.refresh_token) pm.environment.set("refreshToken", data.refresh_token);',
                "}",
              ],
            },
          },
        ]
      : [];
    const item = {
      id: createHash("sha256").update(route.operationId).digest("hex").slice(0, 32),
      name: route.summary,
      request,
      event,
    };
    const items = groups.get(route.tag) ?? [];
    items.push(item);
    groups.set(route.tag, items);
  }
  return {
    info: {
      name: __DISPLAY_NAME_JSON__,
      schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    item: [...groups].map(([name, item]) => ({ name, item })),
  };
}
export function buildPostmanEnvironment() {
  return {
    name: "__PROJECT_NAME__ local",
    values: [
      { key: "baseUrl", value: env.API_BASE_URL, enabled: true },
      { key: "accessToken", value: "", enabled: true, type: "secret" },
      { key: "refreshToken", value: "", enabled: true, type: "secret" },
      ...[
        ...new Set(
          apiContracts.flatMap((route) =>
            [...route.path.matchAll(/:([a-zA-Z0-9_]+)/g)].flatMap((match) =>
              match[1] ? [match[1]] : [],
            ),
          ),
        ),
      ].map((key) => ({ key, value: "", enabled: true })),
    ],
    _postman_variable_scope: "environment",
  };
}
