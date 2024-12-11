import { z } from "zod";

import { AppConnection } from "@app/lib/types";
import { RootAppConnectionSchema } from "@app/services/app-connection/app-connection-schemas";
import { AppConnectionListItem } from "@app/services/app-connection/app-connection-types";

export enum AwsConnectionMethod {
  AssumeRole = "assume-role",
  AccessToken = "access-token"
}

export const AwsAppConnectionListItem: AppConnectionListItem = {
  name: "AWS",
  app: AppConnection.AWS,
  methods: Object.values(AwsConnectionMethod)
};

export const AwsAppConnectionAssumeRoleCredentialsSchema = z.object({
  role: z.string().min(1, "") // TODO
});

export const AwsAppConnectionAccessTokenCredentialsSchema = z.object({
  accessToken: z.string().min(1, "") // TODO
});

const RootAwsAppConnectionSchema = RootAppConnectionSchema.extend({ app: z.literal(AppConnection.AWS) });

export const AwsAppConnectionSchema = z.intersection(
  RootAwsAppConnectionSchema,
  z.discriminatedUnion("method", [
    z.object({
      method: z.literal(AwsConnectionMethod.AssumeRole),
      credentials: AwsAppConnectionAssumeRoleCredentialsSchema
    }),
    z.object({
      method: z.literal(AwsConnectionMethod.AccessToken),
      credentials: AwsAppConnectionAccessTokenCredentialsSchema
    })
  ])
);

export const SanitizedAwsAppConnectionSchema = z.discriminatedUnion("method", [
  RootAwsAppConnectionSchema.extend({
    method: z.literal(AwsConnectionMethod.AssumeRole),
    credentials: AwsAppConnectionAssumeRoleCredentialsSchema.omit({ role: true })
  }),
  RootAwsAppConnectionSchema.extend({
    method: z.literal(AwsConnectionMethod.AccessToken),
    credentials: AwsAppConnectionAccessTokenCredentialsSchema.omit({ accessToken: true })
  })
]);

export type TAwsAppConnection = z.infer<typeof AwsAppConnectionSchema>;
