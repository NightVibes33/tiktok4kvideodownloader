import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeLivePhotoSaveOptions {
  stillImageUrl: string;
  videoUrl: string;
  filenameBase: string;
}

export interface NativeLivePhotoSaveResult {
  success: boolean;
  identifier?: string;
}

interface LivePhotoPlugin {
  saveLivePhoto(options: NativeLivePhotoSaveOptions): Promise<NativeLivePhotoSaveResult>;
}

const LivePhotoPlugin = registerPlugin<LivePhotoPlugin>("LivePhotoPlugin");

export function isNativeIOSApp(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function saveNativeLivePhoto(
  options: NativeLivePhotoSaveOptions,
): Promise<NativeLivePhotoSaveResult> {
  if (!isNativeIOSApp()) {
    throw new Error("Native Live Photo save is only available in the Capacitor iOS app.");
  }

  return LivePhotoPlugin.saveLivePhoto(options);
}
