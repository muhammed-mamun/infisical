import { AppConnection } from "@app/lib/types";
import { TAwsAppConnection, TGitHubAppConnection } from "@app/services/app-connection/app-services";

export type AppConnectionListItem = {
  app: AppConnection;
  name: string;
  methods: string[];
};

export type TAppConnection = { id: string } & (TAwsAppConnection | TGitHubAppConnection);

export type TCreateAppConnectionDTO = Pick<TAppConnection, "credentials" | "method" | "name" | "app">;

export type TAppConnectionCredential = TCreateAppConnectionDTO["credentials"];

export type TUpdateAppConnectionDTO = Partial<Omit<TCreateAppConnectionDTO, "method" | "app">> & {
  connectionId: string;
};
