import createClient, { type Middleware } from "openapi-fetch";
import type { paths } from "./generated/todo-api";
import { authorizationHeader, classifyResponse, ForbiddenError } from "./authz/client";

// The 401/403 rule lives in src/authz/client.ts. This client adds nothing of
// its own about authorization — it only attaches the bearer and defers to
// classifyResponse() for what a refusal means.
const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const header = await authorizationHeader();
    if (header) request.headers.set("Authorization", header);
    return request;
  },
  async onResponse({ response }) {
    if ((await classifyResponse(response.status)) === "forbidden") {
      throw new ForbiddenError(response.status);
    }
    return response;
  },
};

// Same-origin: nginx in this pod reverse-proxies /api to todo-api through the
// API gateway (see nginx/15-aep-api-proxy.sh).
export const todoApi = createClient<paths>({ baseUrl: "/api" });
todoApi.use(authMiddleware);
