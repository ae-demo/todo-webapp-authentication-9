// Config read from the environment, in one place. Every value defaults to ""
// (or a parsed fallback below) so the service still starts with none set --
// the platform injects the real values from the todo-db resource wiring.
import ballerina/os;

configurable string todoDbHost = os:getEnv("TODO_DB_HOST");
configurable string todoDbPortRaw = os:getEnv("TODO_DB_PORT");
configurable string todoDbName = os:getEnv("TODO_DB_DBNAME");
configurable string todoDbUser = os:getEnv("TODO_DB_USER");
configurable string todoDbPassword = os:getEnv("TODO_DB_PASSWORD");

# The default PostgreSQL port, used only when `TODO_DB_PORT` is absent or unparsable.
#
# + return - the configured DB port
final int todoDbPort = parsePort(todoDbPortRaw);

# + raw - the `TODO_DB_PORT` value as the platform injected it
# + return - the port as an int, or 5432 when `raw` is empty or not a number
function parsePort(string raw) returns int {
    int|error parsed = int:fromString(raw);
    if parsed is int {
        return parsed;
    }
    return 5432;
}
