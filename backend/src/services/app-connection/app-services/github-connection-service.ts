import { z } from "zod";

import { AppConnection } from "@app/lib/types";
import { RootAppConnectionSchema } from "@app/services/app-connection/app-connection-schemas";
import { AppConnectionListItem } from "@app/services/app-connection/app-connection-types";

export enum GitHubConnectionMethod {
  OAuth = "oauth",
  App = "github-app"
}

export const GithubAppConnectionListItem: AppConnectionListItem = {
  name: "Github",
  app: AppConnection.GitHub,
  methods: Object.values(GitHubConnectionMethod)
};

export const GitHubAppConnectionAssumeRoleCredentialsSchema = z.object({
  role: z.string().min(1, "") // TODO
});

export const GitHubAppConnectionAccessTokenCredentialsSchema = z.object({
  accessToken: z.string().min(1, "") // TODO
});

const RootGitHubAppConnectionSchema = RootAppConnectionSchema.extend({ app: z.literal(AppConnection.GitHub) });

export const GitHubAppConnectionSchema = z.intersection(
  RootGitHubAppConnectionSchema,
  z.discriminatedUnion("method", [
    z.object({
      method: z.literal(GitHubConnectionMethod.App),
      credentials: GitHubAppConnectionAssumeRoleCredentialsSchema
    }),
    z.object({
      method: z.literal(GitHubConnectionMethod.OAuth),
      credentials: GitHubAppConnectionAccessTokenCredentialsSchema
    })
  ])
);

export const SanitizedGitHubAppConnectionSchema = z.discriminatedUnion("method", [
  RootGitHubAppConnectionSchema.extend({
    method: z.literal(GitHubConnectionMethod.App),
    credentials: GitHubAppConnectionAssumeRoleCredentialsSchema.omit({ role: true })
  }),
  RootGitHubAppConnectionSchema.extend({
    method: z.literal(GitHubConnectionMethod.OAuth),
    credentials: GitHubAppConnectionAccessTokenCredentialsSchema.omit({ accessToken: true })
  })
]);

export type TGitHubAppConnection = z.infer<typeof GitHubAppConnectionSchema>;
