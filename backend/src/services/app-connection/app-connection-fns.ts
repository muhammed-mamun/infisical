import { TAppConnectionServiceFactoryDep } from "@app/services/app-connection/app-connection-service";
import { AppConnectionListItem, TAppConnectionCredential } from "@app/services/app-connection/app-connection-types";
import { AwsAppConnectionListItem, GithubAppConnectionListItem } from "@app/services/app-connection/app-services";
import { KmsDataKey } from "@app/services/kms/kms-types";

export const listAppConnectionOptions = (): AppConnectionListItem[] => {
  return [AwsAppConnectionListItem, GithubAppConnectionListItem];
};

export const encryptAppConnectionCredentials = async ({
  orgId,
  credentials,
  kmsService
}: {
  orgId: string;
  credentials: TAppConnectionCredential;
  kmsService: TAppConnectionServiceFactoryDep["kmsService"];
}) => {
  const { encryptor } = await kmsService.createCipherPairWithDataKey({
    type: KmsDataKey.Organization,
    orgId
  });

  const { cipherTextBlob: encryptedCredentialsBlob } = encryptor({
    plainText: Buffer.from(JSON.stringify(credentials))
  });

  return encryptedCredentialsBlob;
};

export const decryptAppConnectionCredentials = async ({
  orgId,
  encryptedCredentials,
  kmsService
}: {
  orgId: string;
  encryptedCredentials: Buffer;
  kmsService: TAppConnectionServiceFactoryDep["kmsService"];
}) => {
  const { decryptor } = await kmsService.createCipherPairWithDataKey({
    type: KmsDataKey.Organization,
    orgId
  });

  const decryptedPlainTextBlob = decryptor({
    cipherTextBlob: encryptedCredentials
  });

  return JSON.parse(decryptedPlainTextBlob.toString()) as TAppConnectionCredential;
};
