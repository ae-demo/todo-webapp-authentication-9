import { useCallback, useEffect, useMemo, useState, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Chip,
  IconButton,
  ListingTable,
  MenuItem,
  PageContent,
  PageTitle,
  TextField,
  Tooltip,
} from "@wso2/oxygen-ui";
import { CheckCircle2, Circle, Plus } from "@wso2/oxygen-ui-icons-react";
import { todoApi } from "../api";
import { Can } from "../authz/gates";
import type { components } from "../generated/todo-api";

type Todo = components["schemas"]["Todo"];
type StatusFilter = "all" | "active" | "completed";

export function TodoListPage(): JSX.Element {
  const navigate = useNavigate();
  const [todos, setTodos] = useState<Todo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async (filter: StatusFilter) => {
    setError(null);
    const { data, error: apiError } = await todoApi.GET("/me/todos", {
      params: {
        query:
          filter === "all"
            ? {}
            : { completed: filter === "completed" },
      },
    });
    if (apiError) {
      setError("Could not load your todos. Please try again.");
      return;
    }
    setTodos(data.data);
  }, []);

  useEffect(() => {
    void load(statusFilter);
  }, [load, statusFilter]);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return todos ?? [];
    return (todos ?? []).filter((todo) => todo.title.toLowerCase().includes(query));
  }, [todos, search]);

  async function toggleCompletion(todo: Todo): Promise<void> {
    setPendingId(todo.id);
    try {
      const { data, error: apiError } = await todoApi.PUT("/me/todos/{todoId}/completion", {
        params: { path: { todoId: todo.id } },
        body: { completed: !todo.completed },
      });
      if (apiError || !data) {
        setError("Could not update that todo. Please try again.");
        return;
      }
      setTodos((prev) => (prev ?? []).map((t) => (t.id === data.id ? data : t)));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <PageContent>
      <PageTitle>
        <PageTitle.Header>My Todos</PageTitle.Header>
        <PageTitle.Actions>
          <Can op="POST /me/todos">
            <Button
              variant="contained"
              startIcon={<Plus size={18} />}
              onClick={() => navigate("/todos/new")}
            >
              New Todo
            </Button>
          </Can>
        </PageTitle.Actions>
      </PageTitle>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ListingTable.Container>
        <ListingTable.Toolbar
          showSearch
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search todos"
        >
          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
          </TextField>
        </ListingTable.Toolbar>
        <ListingTable>
          <ListingTable.Head>
            <ListingTable.Row>
              <ListingTable.Cell>Todo</ListingTable.Cell>
              <ListingTable.Cell>Status</ListingTable.Cell>
            </ListingTable.Row>
          </ListingTable.Head>
          <ListingTable.Body>
            {visible.length === 0 ? (
              <ListingTable.Row>
                <ListingTable.Cell colSpan={2}>
                  <ListingTable.EmptyState
                    title={todos === null ? "Loading your todos…" : "No todos here"}
                    description={
                      todos === null
                        ? undefined
                        : search
                          ? "No todos match your search."
                          : "Create your first todo to get started."
                    }
                  />
                </ListingTable.Cell>
              </ListingTable.Row>
            ) : (
              visible.map((todo) => (
                <ListingTable.Row key={todo.id}>
                  <ListingTable.Cell>{todo.title}</ListingTable.Cell>
                  <ListingTable.Cell>
                    <Chip
                      label={todo.completed ? "Done" : "Open"}
                      color={todo.completed ? "success" : "default"}
                      size="small"
                    />
                    <Can op="PUT /me/todos/{todoId}/completion">
                      <Tooltip title={todo.completed ? "Reopen" : "Mark complete"}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={pendingId === todo.id}
                            onClick={() => void toggleCompletion(todo)}
                            sx={{ ml: 1 }}
                          >
                            {todo.completed ? (
                              <CheckCircle2 size={18} />
                            ) : (
                              <Circle size={18} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Can>
                  </ListingTable.Cell>
                </ListingTable.Row>
              ))
            )}
          </ListingTable.Body>
        </ListingTable>
      </ListingTable.Container>
    </PageContent>
  );
}
