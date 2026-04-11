import type {
  APIGatewayEventRequestContextJWTAuthorizer,
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
} from "aws-lambda";

export function createApiEvent(
  overrides: Partial<APIGatewayProxyEventV2> = {},
): APIGatewayProxyEventV2 {
  return {
    version: "2.0",
    routeKey: "GET /test",
    rawPath: "/test",
    rawQueryString: "",
    headers: {},
    requestContext: {
      accountId: "123456789012",
      apiId: "api-id",
      domainName: "example.com",
      domainPrefix: "example",
      http: {
        method: "GET",
        path: "/test",
        protocol: "HTTP/1.1",
        sourceIp: "127.0.0.1",
        userAgent: "test",
      },
      requestId: "request-id",
      routeKey: "GET /test",
      stage: "$default",
      time: "01/Jan/2026:00:00:00 +0000",
      timeEpoch: 0,
    },
    isBase64Encoded: false,
    pathParameters: {},
    queryStringParameters: {},
    stageVariables: {},
    body: undefined,
    ...overrides,
  };
}

export function createAuthorizedApiEvent(
  overrides: Partial<APIGatewayProxyEventV2WithJWTAuthorizer> = {},
): APIGatewayProxyEventV2WithJWTAuthorizer {
  const requestContext = createApiEvent().requestContext;

  return {
    ...createApiEvent(),
    requestContext: {
      ...requestContext,
      authorizer: {
        principalId: "principal-id",
        integrationLatency: 0,
        jwt: {
          claims: {},
          scopes: [],
        },
      } as APIGatewayEventRequestContextJWTAuthorizer,
    },
    ...overrides,
  } as APIGatewayProxyEventV2WithJWTAuthorizer;
}
