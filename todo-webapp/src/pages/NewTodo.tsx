import { useState, type FormEvent, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Form, PageContent, PageTitle, Stack, TextField } from "@wso2/oxygen-ui";
import { todoApi } from "../api";

export function NewTodoPage(): JSX.Element {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedTitle = title.trim();
  const titleError = touched && trimmedTitle.length === 0;

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setTouched(true);
    // Prevent an empty title client-side, matching the API's 400 for one.
    if (trimmedTitle.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: apiError } = await todoApi.POST("/me/todos", {
        body: { title: trimmedTitle },
      });
      if (apiError) {
        setError("Could not create that todo. Please check the title and try again.");
        return;
      }
      navigate("/todos");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>New Todo</PageTitle.Header>
      </PageTitle>

      <Form.Section>
        <Form.Stack component="form" onSubmit={(e) => void handleSubmit(e)} spacing={3}>
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setTouched(true)}
            error={titleError}
            helperText={titleError ? "Title is required." : " "}
            required
            autoFocus
          />
          <Stack direction="row" justifyContent="flex-end" spacing={2}>
            <Button variant="outlined" onClick={() => navigate("/todos")}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              Save
            </Button>
          </Stack>
        </Form.Stack>
      </Form.Section>
    </PageContent>
  );
}
