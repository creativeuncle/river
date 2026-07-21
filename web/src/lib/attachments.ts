const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export function isImageAttachment(name: string | null | undefined): boolean {
  return !!name && IMAGE_EXTENSIONS.test(name);
}
