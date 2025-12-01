import { AWS_ACCESS_KEY_ID_ENV, AWS_REGION_ENV, AWS_SECRET_ACCESS_KEY_ENV } from "@/env"
import { S3Client } from "@aws-sdk/client-s3"

export const awsClient = new S3Client({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID_ENV,
    secretAccessKey: AWS_SECRET_ACCESS_KEY_ENV,
  },
  region: AWS_REGION_ENV,
})
