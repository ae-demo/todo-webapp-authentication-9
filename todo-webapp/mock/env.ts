// The keys the platform actually emits for this component: this app's own
// user-auth OIDC keys, and nothing else (no sibling API URL — that is
// same-origin /api, never a window._env_ key).
export const mockEnv = {
  USER_AUTH_CLIENT_ID: "mock-client",
  USER_AUTH_ISSUER: "https://mock-idp.test",
  // Singular `group`/`ou`, exactly as the platform requests them, plus this
  // project's own catalog handles (specs/design/security.json).
  USER_AUTH_SCOPES: "openid profile email group ou todos:read todos:create todos:complete",
  USER_AUTH_RESOURCE: "https://mock-idp.test/resources/mock-project",
};
