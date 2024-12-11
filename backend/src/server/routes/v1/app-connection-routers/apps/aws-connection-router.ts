import { z } from "zod";

import { AppConnections } from "@app/lib/api-docs";
import { AppConnection } from "@app/lib/types";
import { slugSchema } from "@app/server/lib/schemas";
import { registerAppConnectionEndpoints } from "@app/server/routes/v1/app-connection-routers";
import {
  AwsAppConnectionAccessTokenCredentialsSchema,
  AwsAppConnectionAssumeRoleCredentialsSchema,
  AwsAppConnectionSchema,
  AwsConnectionMethod,
  TAwsAppConnection
} from "@app/services/app-connection/app-services";

export const registerAwsConnectionRouter = async (server: FastifyZodProvider) =>
  registerAppConnectionEndpoints<TAwsAppConnection>({
    app: AppConnection.AWS,
    server,
    responseSchema: AwsAppConnectionSchema,
    createSchema: z
      .discriminatedUnion("method", [
        z.object({
          method: z.literal(AwsConnectionMethod.AssumeRole).describe(AppConnections.CREATE.method),
          credentials: AwsAppConnectionAssumeRoleCredentialsSchema.describe(AppConnections.CREATE.credentials)
        }),
        z.object({
          method: z.literal(AwsConnectionMethod.AccessToken).describe(AppConnections.CREATE.method),
          credentials: AwsAppConnectionAccessTokenCredentialsSchema.describe(AppConnections.CREATE.credentials)
        })
      ])
      .and(z.object({ name: slugSchema({ field: "name" }).describe(AppConnections.CREATE.name) })),
    updateSchema: z.object({
      name: slugSchema({ field: "name" }).describe(AppConnections.UPDATE.name),
      credentials: z
        .union([AwsAppConnectionAccessTokenCredentialsSchema, AwsAppConnectionAssumeRoleCredentialsSchema])
        .describe(AppConnections.UPDATE.credentials)
    })
  });
