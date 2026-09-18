import { useEffect, useRef, useState, type JSX } from "react";
import { Navigate } from "react-router-dom";
import { Box, Stack, Typography } from "@wso2/oxygen-ui";
import { handleCallback } from "../authz/session";

/** The OIDC redirect target. Routed OUTSIDE the auth provider — there is no
 * session to read until the redirect has been processed once. */
export function CallbackPage(): JSX.Element {
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void handleCallback().finally(() => setDone(true));
  }, []);

  if (done) return <Navigate to="/" replace />;

  return (
    <Box sx={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Stack spacing={1} alignItems="center">
        <Typography variant="h6">Signing you in…</Typography>
      </Stack>
    </Box>
  );
}
