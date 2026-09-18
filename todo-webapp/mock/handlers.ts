import { http, HttpResponse } from "msw";
import type { components } from "../src/generated/todo-api";

type Todo = components["schemas"]["Todo"];

// Every operation here is under /me/ — the caller's own todos, and nothing
// else — so there is no ownership filter to apply: the path IS the reach.
// State lives in module scope so the app behaves like an app (a create shows
// up in the next list, a completion toggle persists) — reset on every full
// page load, same as the real mockServiceWorker page-context caveat.
let todos: Todo[] = [
  { id: "1", title: "Buy groceries", completed: false, createdAt: "2026-09-10T09:00:00Z" },
  { id: "2", title: "Write report", completed: false, createdAt: "2026-09-11T09:00:00Z" },
  { id: "3", title: "Book dentist", completed: true, createdAt: "2026-09-12T09:00:00Z", updatedAt: "2026-09-15T09:00:00Z" },
];
let nextId = 4;

function errorBody(code: number, message: string) {
  return { code, message };
}

export const handlers = [
  // listMyTodos — GET /me/todos, paginated, filterable by `completed`.
  http.get("/api/me/todos", ({ request }) => {
    const url = new URL(request.url);
    const completedParam = url.searchParams.get("completed");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    const offset = Number(url.searchParams.get("offset") ?? "0");

    let matching = todos;
    if (completedParam !== null) {
      const completed = completedParam === "true";
      matching = matching.filter((t) => t.completed === completed);
    }

    const page = matching.slice(offset, offset + limit);
    const next = offset + limit < matching.length ? `/me/todos?offset=${offset + limit}&limit=${limit}` : null;
    const previous = offset > 0 ? `/me/todos?offset=${Math.max(0, offset - limit)}&limit=${limit}` : null;

    return HttpResponse.json({ count: matching.length, next, previous, data: page });
  }),

  // createMyTodo — POST /me/todos. 400 on an empty/missing title, matching
  // the contract's NewTodo.title minLength: 1.
  http.post("/api/me/todos", async ({ request }) => {
    const input = (await request.json().catch(() => null)) as { title?: string } | null;
    const title = input?.title?.trim();
    if (!title) {
      return HttpResponse.json(errorBody(400, "title is required"), { status: 400 });
    }
    const created: Todo = {
      id: String(nextId++),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    todos = [...todos, created];
    return HttpResponse.json(created, { status: 201 });
  }),

  // getMyTodo — GET /me/todos/{todoId}. Registered AFTER /completion so the
  // more specific path below is not swallowed by this parameterised one.
  http.get("/api/me/todos/:todoId", ({ params }) => {
    const todo = todos.find((t) => t.id === params.todoId);
    if (!todo) return HttpResponse.json(errorBody(404, "no such todo"), { status: 404 });
    return HttpResponse.json(todo);
  }),

  // setMyTodoCompletion — PUT /me/todos/{todoId}/completion.
  http.put("/api/me/todos/:todoId/completion", async ({ params, request }) => {
    const index = todos.findIndex((t) => t.id === params.todoId);
    if (index === -1) return HttpResponse.json(errorBody(404, "no such todo"), { status: 404 });
    const input = (await request.json().catch(() => null)) as { completed?: boolean } | null;
    const updated: Todo = {
      ...todos[index],
      completed: Boolean(input?.completed),
      updatedAt: new Date().toISOString(),
    };
    todos = [...todos.slice(0, index), updated, ...todos.slice(index + 1)];
    return HttpResponse.json(updated);
  }),
];
