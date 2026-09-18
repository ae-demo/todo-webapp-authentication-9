// Assertion verification and ownerId-scoping tests.
//
// Run against a throwaway RSA keypair -- nothing here talks to a real
// gateway or IdP. `GATEWAY_ASSERTION_CERTIFICATE`, `GATEWAY_ASSERTION_ISSUER`
// and `GATEWAY_ASSERTION_HEADER` must be exported before `bal test`, or the
// interceptor falls back to its unverified mode and every case below fails
// for a reason the output does not name.
//
// The store functions (`listTodos`, `getTodo`) are mocked so these tests
// never need a live todo-db: they assert on the HTTP response the gateway
// assertion produces, and on the ownerId each mock was called with.
import ballerina/crypto;
import ballerina/http;
import ballerina/jwt;
import ballerina/lang.array;
import ballerina/test;
import ballerina/time;

const string TEST_ISSUER = "test-gateway";
const string KEY_A_PATH = "tests/resources/keyA.pem";
const string KEY_B_PATH = "tests/resources/keyB.pem";

final http:Client testClient = check new ("http://localhost:9090");

@test:Mock {
    functionName: "listTodos"
}
test:MockFunction listTodosMock = new ();

@test:Mock {
    functionName: "getTodo"
}
test:MockFunction getTodoMock = new ();

// Captured by the mocks below, for the ownerId-scoping assertions.
string capturedListOwnerId = "";
string capturedGetOwnerId = "";
string capturedGetTodoId = "";

function mockListTodos(string ownerId, int 'limit, int offset, boolean? completed)
        returns record {| TodoRow[] items; int total; |}|error {
    capturedListOwnerId = ownerId;
    return {items: [], total: 0};
}

function mockGetTodo(string ownerId, string todoId) returns TodoRow?|error {
    capturedGetOwnerId = ownerId;
    capturedGetTodoId = todoId;
    return {
        id: todoId,
        owner_id: ownerId,
        title: "Sample",
        completed: false,
        created_at: time:utcNow(),
        updated_at: time:utcNow()
    };
}

# A JWT signed with `signingKeyPath`, shaped like the gateway's own assertion.
#
# + signingKeyPath - PEM file of the (throwaway) RSA private key to sign with
# + subject - the `sub` claim -- the caller's userId
# + return - the compact JWT
function mintAssertion(string signingKeyPath, string subject) returns string|error {
    crypto:PrivateKey signingKey = check crypto:decodeRsaPrivateKeyFromKeyFile(signingKeyPath);
    jwt:IssuerConfig issuerConfig = {
        issuer: TEST_ISSUER,
        username: subject,
        expTime: 300,
        customClaims: {"scope": "todos:read todos:create todos:complete"},
        signatureConfig: {
            algorithm: jwt:RS256,
            config: signingKey
        }
    };
    return jwt:issue(issuerConfig);
}

# Edits the payload segment of an already-signed JWT and reassembles it with
# the ORIGINAL signature -- so the signature no longer matches, and the
# caller it now claims to name was never verified.
#
# + token - a validly-signed compact JWT
# + return - the same token with its payload segment altered
function tamperPayload(string token) returns string|error {
    string[] parts = re `\.`.split(token);
    if parts.length() != 3 {
        return error("unexpected JWT shape");
    }
    byte[] payloadBytes = check base64UrlDecode(parts[1]);
    string payloadJson = check string:fromBytes(payloadBytes);
    json payloadValue = check payloadJson.fromJsonString();
    map<json> payloadMap = check payloadValue.ensureType();
    payloadMap["sub"] = "attacker-controlled-subject";
    string tamperedSegment = base64UrlEncode(payloadMap.toJsonString().toBytes());
    return parts[0] + "." + tamperedSegment + "." + parts[2];
}

function base64UrlDecode(string segment) returns byte[]|error {
    string standard = re `-`.replaceAll(segment, "+");
    standard = re `_`.replaceAll(standard, "/");
    int remainder = standard.length() % 4;
    if remainder == 2 {
        standard = standard + "==";
    } else if remainder == 3 {
        standard = standard + "=";
    }
    return array:fromBase64(standard);
}

function base64UrlEncode(byte[] content) returns string {
    string standard = content.toBase64();
    string noPad = re `=+$`.replaceAll(standard, "");
    string urlSafe = re `\+`.replaceAll(noPad, "-");
    return re `/`.replaceAll(urlSafe, "_");
}

@test:Config {}
function testValidAssertionIsAcceptedAndOwnerIdComesFromTheToken() returns error? {
    string subject = "user-valid-" + time:utcNow()[0].toString();
    string token = check mintAssertion(KEY_A_PATH, subject);

    http:Response response = check testClient->get("/me/todos", {"x-jwt-assertion": token});
    test:assertEquals(response.statusCode, 200, "a valid assertion must be accepted");
    test:assertEquals(capturedListOwnerId, subject,
            "ownerId must be the verified assertion's sub, not anything client-supplied");
}

@test:Config {}
function testAssertionSignedByAnotherKeyIsRejected() returns error? {
    string token = check mintAssertion(KEY_B_PATH, "user-wrong-key");

    http:Response response = check testClient->get("/me/todos", {"x-jwt-assertion": token});
    test:assertEquals(response.statusCode, 401,
            "an assertion signed by a key other than the one the gateway published must be a 401");
}

@test:Config {}
function testTamperedPayloadIsRejectedNotServedAnonymously() returns error? {
    string original = check mintAssertion(KEY_A_PATH, "user-original");
    string tampered = check tamperPayload(original);

    http:Response response = check testClient->get("/me/todos", {"x-jwt-assertion": tampered});
    test:assertEquals(response.statusCode, 401,
            "a payload edited after signing must be a 401, never an anonymous caller");
}

@test:Config {}
function testGetSingleTodoIsScopedToTheCallersOwnSub() returns error? {
    string subjectOne = "user-one";
    string subjectTwo = "user-two";
    string tokenOne = check mintAssertion(KEY_A_PATH, subjectOne);
    string tokenTwo = check mintAssertion(KEY_A_PATH, subjectTwo);

    http:Response responseOne = check testClient->get("/me/todos/abc-123", {"x-jwt-assertion": tokenOne});
    test:assertEquals(responseOne.statusCode, 200);
    test:assertEquals(capturedGetOwnerId, subjectOne,
            "the first caller's own sub must be used to scope the row lookup");

    http:Response responseTwo = check testClient->get("/me/todos/abc-123", {"x-jwt-assertion": tokenTwo});
    test:assertEquals(responseTwo.statusCode, 200);
    test:assertEquals(capturedGetOwnerId, subjectTwo,
            "a different caller's own sub must be used, never the previous caller's or a client-supplied id");
    test:assertEquals(capturedGetTodoId, "abc-123");
}

@test:Config {}
function testMissingAssertionIsUnauthorized() returns error? {
    http:Response response = check testClient->get("/me/todos");
    test:assertEquals(response.statusCode, 401, "no assertion at all must not be served as an anonymous caller");
}

@test:BeforeSuite
function wireMocks() {
    test:when(listTodosMock).call("mockListTodos");
    test:when(getTodoMock).call("mockGetTodo");
}
