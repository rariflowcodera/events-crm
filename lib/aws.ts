import { AWS_ACCESS_KEY_ID_ENV, AWS_REGION_ENV, AWS_SECRET_ACCESS_KEY_ENV } from "@/env"
import { S3Client } from "@aws-sdk/client-s3"

// Constructed lazily so importing this module doesn't throw ("Region is missing")
// when STORAGE_PROVIDER=local and no AWS credentials are configured.
let client: S3Client | null = null

export function getAwsClient() {
  if (!client) {
    client = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID_ENV,
        secretAccessKey: AWS_SECRET_ACCESS_KEY_ENV,
      },
      region: AWS_REGION_ENV,
    })
  }
  return client
}
