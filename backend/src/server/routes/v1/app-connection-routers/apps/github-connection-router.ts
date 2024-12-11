import { z } from "zod";

import { AppConnections } from "@app/lib/api-docs";
import { AppConnection } from "@app/lib/types";
import { slugSchema } from "@app/server/lib/schemas";
import { registerAppConnectionEndpoints } from "@app/server/routes/v1/app-connection-routers/app-connection-endpoints";
import {
  GitHubAppConnectionAccessTokenCredentialsSchema,
  GitHubAppConnectionAssumeRoleCredentialsSchema,
  GitHubAppConnectionSchema,
  GitHubConnectionMethod,
  TGitHubAppConnection
} from "@app/services/app-connection/app-services";

export const registerGitHubConnectionRouter = async (server: FastifyZodProvider) =>
  registerAppConnectionEndpoints<TGitHubAppConnection>({
    app: AppConnection.GitHub,
    server,
    responseSchema: GitHubAppConnectionSchema,
    createSchema: z
      .discriminatedUnion("method", [
        z.object({
          method: z.literal(GitHubConnectionMethod.App).describe(AppConnections.CREATE.method),
          credentials: GitHubAppConnectionAssumeRoleCredentialsSchema.describe(AppConnections.CREATE.credentials)
        }),
        z.object({
          method: z.literal(GitHubConnectionMethod.OAuth).describe(AppConnections.CREATE.method),
          credentials: GitHubAppConnectionAccessTokenCredentialsSchema.describe(AppConnections.CREATE.credentials)
        })
      ])
      .and(z.object({ name: slugSchema({ field: "name" }).describe(AppConnections.CREATE.name) })),
    updateSchema: z.object({
      name: slugSchema({ field: "name" }).describe(AppConnections.UPDATE.name),
      credentials: z
        .union([GitHubAppConnectionAccessTokenCredentialsSchema, GitHubAppConnectionAssumeRoleCredentialsSchema])
        .describe(AppConnections.UPDATE.credentials)
    })
  });
