import { AppConnectionsSchema } from "@app/db/schemas/app-connections";

export const RootAppConnectionSchema = AppConnectionsSchema.omit({
  encryptedCredentials: true,
  app: true,
  method: true
});
