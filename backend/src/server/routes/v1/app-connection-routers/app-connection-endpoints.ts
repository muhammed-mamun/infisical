import { z } from "zod";

import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { AppConnections } from "@app/lib/api-docs";
import { APP_CONNECTION_NAME_MAP } from "@app/lib/api-docs/maps";
import { AppConnection } from "@app/lib/types";
import { readLimit, writeLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import { SanitizedAppConnectionSchema } from "@app/server/routes/v1/app-connection-routers/app-connection-router";
import { TAppConnection } from "@app/services/app-connection/app-connection-types";
import { AwsAppConnectionSchema, TAwsAppConnection } from "@app/services/app-connection/app-services";
import { AuthMode } from "@app/services/auth/auth-type";

export const registerAppConnectionEndpoints = <T extends TAppConnection>({
  server,
  app,
  createSchema,
  updateSchema,
  responseSchema
}: {
  app: AppConnection;
  server: FastifyZodProvider;
  createSchema: z.ZodType<{ name: string; method: T["method"]; credentials: T["credentials"] }>;
  updateSchema: z.ZodType<{ name?: string; credentials?: T["credentials"] }>;
  responseSchema: z.ZodTypeAny;
}) => {
  const appName = APP_CONNECTION_NAME_MAP[app];

  server.route({
    method: "GET",
    url: `/`,
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: `List of App Connections for ${appName}.`,
      response: {
        200: z.object({ appConnections: responseSchema.array() })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const appConnections = (await server.services.appConnection.listAppConnectionsByOrg(req.permission, app)) as T[];

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_APP_CONNECTIONS,
          metadata: {
            app
          }
        }
      });

      return { appConnections };
    }
  });

  server.route({
    method: "GET",
    url: "/:connectionId",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: `Get the specified ${appName} App Connection by ID.`,
      params: z.object({
        connectionId: z.string().uuid().describe(AppConnections.GET_BY_ID.connectionId)
      }),
      response: {
        200: z.object({ appConnection: SanitizedAppConnectionSchema })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const { connectionId } = req.params;

      const appConnection = (await server.services.appConnection.findAppConnectionById(
        app,
        connectionId,
        req.permission
      )) as T;

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_APP_CONNECTION,
          metadata: {
            connectionId
          }
        }
      });

      return { appConnection };
    }
  });

  server.route({
    method: "GET",
    url: `/name/:connectionName`,
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: `Get the specified ${appName} App Connection by name.`,
      params: z.object({
        connectionName: z
          .string()
          .min(0, "Connection name required")
          .describe(AppConnections.GET_BY_NAME.connectionName)
      }),
      response: {
        200: z.object({ appConnection: SanitizedAppConnectionSchema })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const { connectionName } = req.params;

      const appConnection = (await server.services.appConnection.findAppConnectionByName(
        app,
        connectionName,
        req.permission
      )) as T;

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_APP_CONNECTION,
          metadata: {
            connectionId: appConnection.id
          }
        }
      });

      return { appConnection };
    }
  });

  server.route({
    method: "POST",
    url: "/",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: `Create an App Connection for ${appName}.`,
      body: createSchema,
      response: {
        200: z.object({ appConnection: AwsAppConnectionSchema })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const { name, method, credentials } = req.body;

      // TODO: validate connection

      const appConnection = (await server.services.appConnection.createAppConnection(
        { name, method, app, credentials },
        req.permission
      )) as TAwsAppConnection;

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.CREATE_APP_CONNECTION,
          metadata: {
            name,
            method,
            app,
            connectionId: appConnection.id
          }
        }
      });

      return { appConnection };
    }
  });

  server.route({
    method: "PATCH",
    url: "/:connectionId",
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: `Create an App Connection for the specified ${appName}.`,
      params: z.object({
        connectionId: z.string().uuid().describe(AppConnections.UPDATE.connectionId)
      }),
      body: updateSchema,
      response: {
        200: z.object({ appConnection: responseSchema })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const { name, credentials } = req.body;
      const { connectionId } = req.params;

      const appConnection = (await server.services.appConnection.updateAppConnection(
        { name, credentials, connectionId },
        req.permission
      )) as TAwsAppConnection;

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.UPDATE_APP_CONNECTION,
          metadata: {
            name,
            credentialsUpdated: Boolean(credentials),
            connectionId
          }
        }
      });

      return { appConnection };
    }
  });

  server.route({
    method: "DELETE",
    url: `/:connectionId`,
    config: {
      rateLimit: writeLimit
    },
    schema: {
      description: `Delete the specified ${appName} App Connection.`,
      params: z.object({
        connectionId: z.string().uuid().describe(AppConnections.DELETE.connectionId)
      }),
      response: {
        200: z.object({ appConnection: SanitizedAppConnectionSchema })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const { connectionId } = req.params;

      const appConnection = (await server.services.appConnection.deleteAppConnection(
        app,
        connectionId,
        req.permission
      )) as T;

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.DELETE_APP_CONNECTION,
          metadata: {
            connectionId
          }
        }
      });

      return { appConnection };
    }
  });
};
