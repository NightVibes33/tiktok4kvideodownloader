interface LivePhotoAssets {
  stillImageUrl: string;
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
}

interface NativeLivePhotoPlugin {
  saveLivePhoto(options: {
    stillImageUrl: string;
    videoUrl: string;
    filenameBase: string;
  }): Promise<{ success?: boolean; identifier?: string }>;
}

type CapacitorWindow = Window & {
  Capacitor?: {
    Plugins?: {
      LivePhotoPlugin?: NativeLivePhotoPlugin;
    };
    getPlatform?: () => string;
    isNativePlatform?: () => boolean;
  };
};

function getNativeLivePhotoPlugin(): NativeLivePhotoPlugin | null {
  if (typeof window === "undefined") return null;

  const capacitor = (window as CapacitorWindow).Capacitor;
  if (!capacitor) return null;

  const platform = typeof capacitor.getPlatform === "function"
    ? capacitor.getPlatform()
    : undefined;
  const isNative = typeof capacitor.isNativePlatform === "function"
    ? capacitor.isNativePlatform()
    : platform !== undefined && platform !== "web";

  if (!isNative || platform !== "ios") return null;

  return capacitor.Plugins?.LivePhotoPlugin ?? null;
}

function getImageExtension(blob: Blob): string {
  if (blob.type.includes("png")) return "png";
  if (blob.type.includes("webp")) return "webp";
  return "jpg";
}

async function fetchImageFile(imageUrl: string, baseFilename: string): Promise<File> {
  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Failed to fetch image");

  const blob = await response.blob();
  const extension = getImageExtension(blob);

  return new File([blob], `${baseFilename}.${extension}`, {
    type: blob.type || "image/jpeg",
  });
}

export function canSaveLivePhotosNatively(): boolean {
  return !!getNativeLivePhotoPlugin()?.saveLivePhoto;
}

export async function downloadImageFallback(imageUrl: string, baseFilename: string): Promise<void> {
  const file = await fetchImageFile(imageUrl, baseFilename);
  const objectUrl = URL.createObjectURL(file);

  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
  }
}

export async function shareImageFallbackOnIOS(imageUrl: string, baseFilename: string): Promise<void> {
  const file = await fetchImageFile(imageUrl, baseFilename);

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: baseFilename,
    });
    return;
  }

  await downloadImageFallback(imageUrl, baseFilename);
}

export async function downloadLivePhoto(
  assets: LivePhotoAssets,
  baseFilename: string,
): Promise<void> {
  const plugin = getNativeLivePhotoPlugin();
  if (!plugin?.saveLivePhoto) {
    throw new Error("Native Live Photo save is unavailable in this context.");
  }

  await plugin.saveLivePhoto({
    stillImageUrl: assets.stillImageUrl,
    videoUrl: assets.videoUrl,
    filenameBase: baseFilename,
  });
}

export async function shareLivePhotoOnIOS(
  assets: LivePhotoAssets,
  title: string,
): Promise<void> {
  await downloadLivePhoto(assets, title);
}

export default {
  canSaveLivePhotosNatively,
  downloadImageFallback,
  downloadLivePhoto,
  shareImageFallbackOnIOS,
  shareLivePhotoOnIOS,
};
