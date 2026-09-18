// Persistence for the todo entity, in todo-db (postgres-cnpg). This service
// owns its storage: it connects with the platform-injected TODO_DB_* values
// and creates its own table at startup if it does not exist yet.
import ballerina/log;
import ballerina/sql;
import ballerina/time;
import ballerina/uuid;
import ballerinax/postgresql;
import ballerinax/postgresql.driver as _;

// Not `check`ed: the component contract requires this service to start with
// no required environment variables, so an unreachable/unconfigured todo-db
// (e.g. TODO_DB_* all empty) must not stop the listener starting. Every
// store function below narrows this with `check dbClientOrError`, so a
// genuinely broken connection still fails each request with a clean 500
// rather than the service refusing to come up at all.
final postgresql:Client|error dbClientOrError = new (
    host = todoDbHost,
    username = todoDbUser,
    password = todoDbPassword,
    database = todoDbName,
    port = todoDbPort,
    options = {connectTimeout: 10}
);

// Best-effort at startup; a store function's own `check dbClientOrError`
// reports the same failure per-request if this could not run here.
final () dbTableInitLogged = initTodoTable();

# One row of the `todo` table, field names matching its columns verbatim --
# this is the DB wire contract, not application vocabulary.
public type TodoRow record {|
    string id;
    string owner_id;
    string title;
    boolean completed;
    time:Utc created_at;
    time:Utc updated_at;
|};

function initTodoTable() {
    postgresql:Client|error dbClient = dbClientOrError;
    if dbClient is error {
        log:printWarn("todo-db not reachable at startup; each request will retry the connection",
                'error = dbClient);
        return;
    }
    sql:ExecutionResult|sql:Error result = dbClient->execute(`
        CREATE TABLE IF NOT EXISTS todo (
            id VARCHAR(64) PRIMARY KEY,
            owner_id VARCHAR(128) NOT NULL,
            title VARCHAR(500) NOT NULL,
            completed BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        )
    `);
    if result is sql:Error {
        log:printWarn("failed to ensure the todo table exists at startup", 'error = result);
    }
}

# The caller's todos, newest first, optionally filtered by completion.
#
# + ownerId - the verified caller's `sub`, never a client-supplied id
# + 'limit - page size
# + offset - page offset
# + completed - when present, filters to only that completion state
# + return - the matching page and the total count of matching rows
public function listTodos(string ownerId, int 'limit, int offset, boolean? completed)
        returns record {| TodoRow[] items; int total; |}|error {
    postgresql:Client dbClient = check dbClientOrError;
    sql:ParameterizedQuery whereClause = `WHERE owner_id = ${ownerId}`;
    if completed is boolean {
        whereClause = sql:queryConcat(whereClause, ` AND completed = ${completed}`);
    }

    sql:ParameterizedQuery countQuery = sql:queryConcat(`SELECT COUNT(*) FROM todo `, whereClause);
    int total = check dbClient->queryRow(countQuery);

    sql:ParameterizedQuery selectQuery = sql:queryConcat(
        `SELECT id, owner_id, title, completed, created_at, updated_at FROM todo `,
        whereClause,
        ` ORDER BY created_at DESC, id DESC LIMIT ${'limit} OFFSET ${offset}`
    );
    stream<TodoRow, sql:Error?> resultStream = dbClient->query(selectQuery);
    TodoRow[] items = [];
    check from TodoRow row in resultStream
        do {
            items.push(row);
        };
    return {items, total};
}

# A single one of the caller's todos.
#
# + ownerId - the verified caller's `sub`
# + todoId - the todo's id
# + return - the row, or `()` when it does not exist or is not the caller's
public function getTodo(string ownerId, string todoId) returns TodoRow?|error {
    postgresql:Client dbClient = check dbClientOrError;
    sql:ParameterizedQuery query = `SELECT id, owner_id, title, completed, created_at, updated_at
        FROM todo WHERE id = ${todoId} AND owner_id = ${ownerId}`;
    TodoRow|sql:Error result = dbClient->queryRow(query);
    if result is sql:NoRowsError {
        return ();
    }
    if result is sql:Error {
        return result;
    }
    return result;
}

# Creates a todo for the caller. `ownerId` is stamped from the verified
# assertion, never read from the request body.
#
# + ownerId - the verified caller's `sub`
# + title - the new todo's title
# + return - the created row
public function createTodo(string ownerId, string title) returns TodoRow|error {
    postgresql:Client dbClient = check dbClientOrError;
    string id = uuid:createRandomUuid();
    time:Utc now = time:utcNow();
    sql:ParameterizedQuery query = `INSERT INTO todo (id, owner_id, title, completed, created_at, updated_at)
        VALUES (${id}, ${ownerId}, ${title}, false, ${now}, ${now})`;
    sql:ExecutionResult _ = check dbClient->execute(query);
    return {id, owner_id: ownerId, title, completed: false, created_at: now, updated_at: now};
}

# Marks the caller's todo complete or reopens it.
#
# + ownerId - the verified caller's `sub`
# + todoId - the todo's id
# + completed - the new completion state
# + return - the updated row, or `()` when it does not exist or is not the caller's
public function setTodoCompletion(string ownerId, string todoId, boolean completed) returns TodoRow?|error {
    postgresql:Client dbClient = check dbClientOrError;
    time:Utc now = time:utcNow();
    sql:ParameterizedQuery query = `UPDATE todo SET completed = ${completed}, updated_at = ${now}
        WHERE id = ${todoId} AND owner_id = ${ownerId}`;
    sql:ExecutionResult result = check dbClient->execute(query);
    int? affectedRowCount = result.affectedRowCount;
    if affectedRowCount is () || affectedRowCount == 0 {
        return ();
    }
    return getTodo(ownerId, todoId);
}
