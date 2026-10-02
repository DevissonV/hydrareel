import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';

const required = [
  'BUCKET_ENDPOINT',
  'BUCKET_REGION',
  'BUCKET_NAME',
  'BUCKET_ACCESS_KEY_ID',
  'BUCKET_SECRET_ACCESS_KEY',
];
for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
}

const s3 = new S3Client({
  region: process.env.BUCKET_REGION,
  endpoint: process.env.BUCKET_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
  },
});

let deleted = 0;
let bytes = 0;

for (;;) {
  const page = await s3.send(new ListObjectsV2Command({
    Bucket: process.env.BUCKET_NAME,
    MaxKeys: 1000,
  }));
  const objects = (page.Contents ?? []).filter((x) => x.Key);
  if (!objects.length) break;

  bytes += objects.reduce((sum, x) => sum + Number(x.Size ?? 0), 0);
  await s3.send(new DeleteObjectsCommand({
    Bucket: process.env.BUCKET_NAME,
    Delete: {
      Objects: objects.map((x) => ({ Key: x.Key })),
      Quiet: true,
    },
  }));

  deleted += objects.length;
  console.log(JSON.stringify({ event: 'hydrareel_bucket_purge_batch', deleted, bytes }));
}

const verify = await s3.send(new ListObjectsV2Command({
  Bucket: process.env.BUCKET_NAME,
  MaxKeys: 1,
}));

const remaining = verify.KeyCount ?? (verify.Contents?.length ?? 0);
console.log(JSON.stringify({
  event: 'HYDRAREEL_BUCKET_PURGE_COMPLETE',
  deletedObjects: deleted,
  deletedBytes: bytes,
  remainingObjects: remaining,
}));

if (remaining !== 0) process.exit(2);
