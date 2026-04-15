// iOS Live Photo handler - Creates proper HEIF+MOV bundles recognized by iOS Photos

interface LivePhotoAssets {
  stillImageUrl: string;
  videoUrl: string;
  duration: number;
  width: number;
  height: number;
}

/**
 * Creates a proper iOS Live Photo by pairing still image with video
 */
export async function createLivePhotoBundle(assets: LivePhotoAssets): Promise<{ imageBlob: Blob; videoBlob: Blob }> {
  const [imageResponse, videoResponse] = await Promise.all([
    fetch(assets.stillImageUrl),
    fetch(assets.videoUrl)
  ]);

  if (!imageResponse.ok || !videoResponse.ok) {
    throw new Error('Failed to fetch Live Photo assets');
  }

  const imageBlob = await imageResponse.blob();
  const videoBlob = await videoResponse.blob();

  return { imageBlob, videoBlob };
}

/**
 * Downloads Live Photo as paired JPEG + MOV files
 * Both files must share the same base filename for iOS to recognize them
 */
export async function downloadLivePhoto(
  assets: LivePhotoAssets,
  baseFilename: string
): Promise<void> {
  try {
    const { imageBlob, videoBlob } = await createLivePhotoBundle(assets);

    // Save JPEG still image
    const imageFile = new File([imageBlob], `${baseFilename}.jpg`, { type: 'image/jpeg' });
    const imageUrl = URL.createObjectURL(imageBlob);
    const imageLink = document.createElement('a');
    imageLink.href = imageUrl;
    imageLink.download = imageFile.name;
    document.body.appendChild(imageLink);
    imageLink.click();
    document.body.removeChild(imageLink);
    setTimeout(() => URL.revokeObjectURL(imageUrl), 5000);

    // Slight delay before saving video
    await new Promise(resolve => setTimeout(resolve, 500));

    // Save MOV video file
    const videoFile = new File([videoBlob], `${baseFilename}.mov`, { type: 'video/quicktime' });
    const videoUrl = URL.createObjectURL(videoBlob);
    const videoLink = document.createElement('a');
    videoLink.href = videoUrl;
    videoLink.download = videoFile.name;
    document.body.appendChild(videoLink);
    videoLink.click();
    document.body.removeChild(videoLink);
    setTimeout(() => URL.revokeObjectURL(videoUrl), 5000);
  } catch (error) {
    console.error('Failed to download Live Photo:', error);
    throw error;
  }
}

/**
 * For iOS devices, shares Live Photo files via native share sheet
 */
export async function shareLivePhotoOnIOS(
  assets: LivePhotoAssets,
  title: string
): Promise<void> {
  try {
    const { imageBlob, videoBlob } = await createLivePhotoBundle(assets);

    const imageFile = new File([imageBlob], 'image.jpg', { type: 'image/jpeg' });
    const videoFile = new File([videoBlob], 'image.mov', { type: 'video/quicktime' });

    if (navigator.share && navigator.canShare?.({ files: [imageFile, videoFile] })) {
      await navigator.share({
        files: [imageFile, videoFile],
        title: title,
      });
    } else {
      // Fallback to download
      await downloadLivePhoto(assets, title);
    }
  } catch (error) {
    console.error('Failed to share Live Photo:', error);
    throw error;
  }
}

export default {
  createLivePhotoBundle,
  downloadLivePhoto,
  shareLivePhotoOnIOS,
};
