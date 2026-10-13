import { z } from 'zod';

const optionalValue = (schema: z.ZodType<string>) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
export const cloudinaryEnvironmentSchema = z.object({
  CLOUDINARY_CLOUD_NAME: optionalValue(z.string().regex(/^[a-zA-Z0-9_-]+$/)),
  CLOUDINARY_API_KEY: optionalValue(z.string().regex(/^\d+$/)),
  CLOUDINARY_API_SECRET: optionalValue(z.string().min(16)),
  CLOUDINARY_FOLDER: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/)
    .default('social-scheduler'),
});
export type CloudinaryEnvironment = z.infer<typeof cloudinaryEnvironmentSchema>;

export function cloudinaryCredentials(environment: CloudinaryEnvironment) {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, CLOUDINARY_FOLDER } =
    environment;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return undefined;
  return {
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    folder: CLOUDINARY_FOLDER,
  };
}
