import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.PHOTOS_BUCKET as string;
const s3 = new S3Client({});

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    if (!BUCKET) throw new Error('PHOTOS_BUCKET not set');
    const body = event.body ? JSON.parse(event.body) : {};
    const contentType = typeof body.contentType === 'string' ? body.contentType : 'image/jpeg';
    const key = typeof body.key === 'string' ? body.key : `profiles/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    const putCmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
    const uploadUrl = await getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 });
    const publicUrl = `https://${BUCKET}.s3.amazonaws.com/${encodeURIComponent(key)}`;

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
      body: JSON.stringify({ uploadUrl, key, publicUrl }),
    };
  } catch (e: any) {
    console.error('getUploadUrl error', e);
    return { statusCode: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' }, body: JSON.stringify({ message: 'Internal error' }) };
  }
};