import Foundation
import Capacitor
import Photos

@objc(LivePhotoPlugin)
public class LivePhotoPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LivePhotoPlugin"
    public let jsName = "LivePhotoPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "saveLivePhoto", returnType: CAPPluginReturnPromise)
    ]

    @objc func saveLivePhoto(_ call: CAPPluginCall) {
        guard let stillImageUrl = call.getString("stillImageUrl"),
              let videoUrl = call.getString("videoUrl"),
              let filenameBase = call.getString("filenameBase"),
              let stillRemoteURL = URL(string: stillImageUrl),
              let videoRemoteURL = URL(string: videoUrl) else {
            call.reject("stillImageUrl, videoUrl, and filenameBase are required.")
            return
        }

        Task {
            do {
                let authorization = await requestPhotoAuthorization()
                guard authorization == .authorized || authorization == .limited else {
                    call.reject("Photo Library access is required to save Live Photos.")
                    return
                }

                let photoFileURL = try await downloadToTemporaryFile(
                    from: stillRemoteURL,
                    suggestedFileName: "\(filenameBase).jpg"
                )
                let videoFileURL = try await downloadToTemporaryFile(
                    from: videoRemoteURL,
                    suggestedFileName: "\(filenameBase).mov"
                )

                let identifier = try await saveLivePhotoAsset(photoURL: photoFileURL, videoURL: videoFileURL)

                try? FileManager.default.removeItem(at: photoFileURL)
                try? FileManager.default.removeItem(at: videoFileURL)

                call.resolve([
                    "success": true,
                    "identifier": identifier
                ])
            } catch {
                call.reject("Failed to save Live Photo: \(error.localizedDescription)")
            }
        }
    }

    private func requestPhotoAuthorization() async -> PHAuthorizationStatus {
        await withCheckedContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
                continuation.resume(returning: status)
            }
        }
    }

    private func downloadToTemporaryFile(from remoteURL: URL, suggestedFileName: String) async throws -> URL {
        try await withCheckedThrowingContinuation { continuation in
            let task = URLSession.shared.downloadTask(with: remoteURL) { temporaryURL, _, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let temporaryURL = temporaryURL else {
                    continuation.resume(throwing: NSError(
                        domain: "LivePhotoPlugin",
                        code: -1,
                        userInfo: [NSLocalizedDescriptionKey: "Remote download did not return a temporary file."]
                    ))
                    return
                }

                let destinationURL = FileManager.default.temporaryDirectory
                    .appendingPathComponent(UUID().uuidString)
                    .appendingPathExtension((suggestedFileName as NSString).pathExtension)

                do {
                    if FileManager.default.fileExists(atPath: destinationURL.path) {
                        try FileManager.default.removeItem(at: destinationURL)
                    }
                    try FileManager.default.moveItem(at: temporaryURL, to: destinationURL)
                    continuation.resume(returning: destinationURL)
                } catch {
                    continuation.resume(throwing: error)
                }
            }

            task.resume()
        }
    }

    private func saveLivePhotoAsset(photoURL: URL, videoURL: URL) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            var localIdentifier: String?

            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()

                let photoOptions = PHAssetResourceCreationOptions()
                photoOptions.shouldMoveFile = false

                let videoOptions = PHAssetResourceCreationOptions()
                videoOptions.shouldMoveFile = false

                request.addResource(with: .photo, fileURL: photoURL, options: photoOptions)
                request.addResource(with: .pairedVideo, fileURL: videoURL, options: videoOptions)

                localIdentifier = request.placeholderForCreatedAsset?.localIdentifier
            }, completionHandler: { success, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }

                guard success else {
                    continuation.resume(throwing: NSError(
                        domain: "LivePhotoPlugin",
                        code: -2,
                        userInfo: [NSLocalizedDescriptionKey: "Photos rejected the Live Photo asset pair."]
                    ))
                    return
                }

                continuation.resume(returning: localIdentifier ?? "")
            })
        }
    }
}
