import { ForbiddenError } from "@casl/ability";

import { OrgPermissionActions, OrgPermissionSubjects } from "@app/ee/services/permission/org-permission";
import { TPermissionServiceFactory } from "@app/ee/services/permission/permission-service";
import { BadRequestError, NotFoundError } from "@app/lib/errors";
import { AppConnection, OrgServiceActor } from "@app/lib/types";
import {
  decryptAppConnectionCredentials,
  encryptAppConnectionCredentials,
  listAppConnectionOptions
} from "@app/services/app-connection/app-connection-fns";
import {
  TAppConnection,
  TCreateAppConnectionDTO,
  TUpdateAppConnectionDTO
} from "@app/services/app-connection/app-connection-types";
import { TKmsServiceFactory } from "@app/services/kms/kms-service";

import { TAppConnectionDALFactory } from "./app-connection-dal";

export type TAppConnectionServiceFactoryDep = {
  appConnectionDAL: TAppConnectionDALFactory;
  permissionService: Pick<TPermissionServiceFactory, "getOrgPermission">;
  kmsService: Pick<TKmsServiceFactory, "createCipherPairWithDataKey">;
};

export type TAppConnectionServiceFactory = ReturnType<typeof appConnectionServiceFactory>;

export const appConnectionServiceFactory = ({
  appConnectionDAL,
  permissionService,
  kmsService
}: TAppConnectionServiceFactoryDep) => {
  const listAppConnectionsByOrg = async (actor: OrgServiceActor, app?: AppConnection) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.AppConnections);

    const appConnections = await appConnectionDAL.find({
      orgId: actor.orgId,
      app
    });

    return Promise.all(
      appConnections.map(async ({ encryptedCredentials, ...connection }) => {
        const credentials = await decryptAppConnectionCredentials({
          encryptedCredentials,
          kmsService,
          orgId: connection.orgId
        });

        return {
          ...connection,
          credentials
        } as TAppConnection;
      })
    );
  };

  const findAppConnectionById = async (app: AppConnection, connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await appConnectionDAL.findById(connectionId);

    if (!appConnection) throw new NotFoundError({ message: `Could not find App Connection with ID ${connectionId}` });

    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      appConnection.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.AppConnections);

    if (appConnection.app !== app)
      throw new BadRequestError({ message: `App Connection with ID ${connectionId} is not for App "${app}"` });

    return {
      ...appConnection,
      credentials: await decryptAppConnectionCredentials({
        encryptedCredentials: appConnection.encryptedCredentials,
        orgId: appConnection.orgId,
        kmsService
      })
    } as TAppConnection;
  };

  const findAppConnectionByName = async (app: AppConnection, connectionName: string, actor: OrgServiceActor) => {
    const appConnection = await appConnectionDAL.findOne({ name: connectionName, orgId: actor.orgId });

    if (!appConnection)
      throw new NotFoundError({ message: `Could not find App Connection with name ${connectionName}` });

    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      appConnection.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Read, OrgPermissionSubjects.AppConnections);

    if (appConnection.app !== app)
      throw new BadRequestError({ message: `App Connection with name ${connectionName} is not for App "${app}"` });

    return {
      ...appConnection,
      credentials: await decryptAppConnectionCredentials({
        encryptedCredentials: appConnection.encryptedCredentials,
        orgId: appConnection.orgId,
        kmsService
      })
    } as TAppConnection;
  };

  const createAppConnection = async ({ credentials, ...data }: TCreateAppConnectionDTO, actor: OrgServiceActor) => {
    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      actor.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Create, OrgPermissionSubjects.AppConnections);

    const encryptedCredentials = await encryptAppConnectionCredentials({ credentials, orgId: actor.orgId, kmsService });

    const appConnection = await appConnectionDAL.create({
      orgId: actor.orgId,
      encryptedCredentials,
      ...data
    });

    return { ...appConnection, credentials };
  };

  const updateAppConnection = async (
    { connectionId, credentials, ...data }: TUpdateAppConnectionDTO,
    actor: OrgServiceActor
  ) => {
    const appConnection = await appConnectionDAL.findById(connectionId);

    if (!appConnection) throw new NotFoundError({ message: `Could not find App Connection with ID ${connectionId}` });

    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      appConnection.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Edit, OrgPermissionSubjects.AppConnections);

    if (data.name && appConnection.name !== data.name) {
      const isConflictingName = Boolean(
        await appConnectionDAL.findOne({
          name: data.name,
          orgId: appConnection.orgId
        })
      );

      if (isConflictingName)
        throw new BadRequestError({
          message: `An App Cøonnection with the name "${data.name}" already exists.`
        });
    }

    let encryptedCredentials: undefined | Buffer;

    if (credentials) {
      encryptedCredentials = await encryptAppConnectionCredentials({ credentials, orgId: actor.orgId, kmsService });
    }

    const updatedAppConnection = await appConnectionDAL.updateById(connectionId, {
      orgId: actor.orgId,
      encryptedCredentials,
      ...data
    });

    return {
      ...updatedAppConnection,
      credentials:
        credentials ??
        (await decryptAppConnectionCredentials({
          encryptedCredentials: updatedAppConnection.encryptedCredentials,
          orgId: updatedAppConnection.orgId,
          kmsService
        }))
    } as TAppConnection;
  };

  const deleteAppConnection = async (app: AppConnection, connectionId: string, actor: OrgServiceActor) => {
    const appConnection = await appConnectionDAL.findById(connectionId);

    if (!appConnection) throw new NotFoundError({ message: `Could not find App Connection with ID ${connectionId}` });

    const { permission } = await permissionService.getOrgPermission(
      actor.type,
      actor.id,
      actor.orgId,
      actor.authMethod,
      appConnection.orgId
    );

    ForbiddenError.from(permission).throwUnlessCan(OrgPermissionActions.Delete, OrgPermissionSubjects.AppConnections);

    if (appConnection.app !== app)
      throw new BadRequestError({ message: `App Connection with ID ${connectionId} is not for App "${app}"` });

    // TODO: clarify delete message if due to existing dependencies

    const deletedAppConnection = await appConnectionDAL.deleteById(connectionId);

    return {
      ...deletedAppConnection,
      credentials: await decryptAppConnectionCredentials({
        encryptedCredentials: deletedAppConnection.encryptedCredentials,
        orgId: deletedAppConnection.orgId,
        kmsService
      })
    } as TAppConnection;
  };

  return {
    listAppConnectionOptions,
    listAppConnectionsByOrg,
    findAppConnectionById,
    findAppConnectionByName,
    createAppConnection,
    updateAppConnection,
    deleteAppConnection
  };
};
