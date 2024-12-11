import { z } from "zod";

import { EventType } from "@app/ee/services/audit-log/audit-log-types";
import { AppConnection } from "@app/lib/types";
import { readLimit } from "@app/server/config/rateLimiter";
import { verifyAuth } from "@app/server/plugins/auth/verify-auth";
import {
  SanitizedAwsAppConnectionSchema,
  SanitizedGitHubAppConnectionSchema
} from "@app/services/app-connection/app-services";
import { AuthMode } from "@app/services/auth/auth-type";

// can't use discriminated due to multiple schemas for certain apps
export const SanitizedAppConnectionSchema = z.union([
  ...SanitizedAwsAppConnectionSchema.options,
  ...SanitizedGitHubAppConnectionSchema.options
]);

export type TSanitizedAppConnection = z.infer<typeof SanitizedAppConnectionSchema>;

export const registerAppConnectionRouter = async (server: FastifyZodProvider) => {
  server.route({
    method: "GET",
    url: "/options",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List of App Connection Options.",
      response: {
        200: z.object({
          appConnectionOptions: z
            .object({
              name: z.string(),
              app: z.nativeEnum(AppConnection),
              methods: z.string().array()
            })
            .array()
        })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: () => {
      const appConnectionOptions = server.services.appConnection.listAppConnectionOptions();
      return { appConnectionOptions };
    }
  });

  server.route({
    method: "GET",
    url: "/",
    config: {
      rateLimit: readLimit
    },
    schema: {
      description: "List of App Connections.",
      response: {
        200: z.object({ appConnections: SanitizedAppConnectionSchema.array() })
      }
    },
    onRequest: verifyAuth([AuthMode.JWT, AuthMode.SERVICE_TOKEN]),
    handler: async (req) => {
      const appConnections = await server.services.appConnection.listAppConnectionsByOrg(req.permission);

      await server.services.auditLog.createAuditLog({
        ...req.auditLogInfo,
        orgId: req.permission.orgId,
        event: {
          type: EventType.GET_APP_CONNECTIONS
        }
      });

      return { appConnections };
    }
  });
};
