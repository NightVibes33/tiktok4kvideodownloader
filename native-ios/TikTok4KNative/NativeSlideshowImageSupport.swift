import Foundation
import ImageIO
import Photos
import UniformTypeIdentifiers
import UIKit

enum NativeSlideshowSaveError: LocalizedError {
    case invalidImageData
    case unableToCreateImageFile
    case missingVideoTrack
    case livePhotoPairRejected
    case writerFailed(String)
    case readerFailed(String)
    case metadataFailed

    var errorDescription: String? {
        switch self {
        case .invalidImageData: return "The downloaded image format could not be converted for Photos."
        case .unableToCreateImageFile: return "The image file could not be prepared for saving."
        case .missingVideoTrack: return "The slideshow video could not be converted into a Live Photo pair."
        case .livePhotoPairRejected: return "iOS Photos rejected the Live Photo pair."
        case .writerFailed(let message): return message
        case .readerFailed(let message): return message
        case .metadataFailed: return "The Live Photo metadata could not be generated."
        }
    }
}

enum NativeSlideshowImageSupport {
    static func requestAddOnlyAuthorization() async throws {
        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        if status == .authorized || status == .limited { return }
        let newStatus: PHAuthorizationStatus = await withCheckedContinuation { (continuation: CheckedContinuation<PHAuthorizationStatus, Never>) in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { continuation.resume(returning: $0) }
        }
        guard newStatus == .authorized || newStatus == .limited else {
            throw NativeAppError.photosPermissionDenied
        }
    }

    static func downloadData(from remoteString: String) async throws -> Data {
        guard let url = URL(string: remoteString) else { throw NativeAppError.invalidURL }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw NativeAppError.missingRemoteAsset }
        return data
    }

    static func downloadRemoteFile(from remoteString: String, suggestedExtension: String) async throws -> URL {
        let data = try await downloadData(from: remoteString)
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(suggestedExtension)
        try data.write(to: outputURL, options: .atomic)
        return outputURL
    }

    static func makeJPEGPhotoFile(from remoteString: String, assetIdentifier: String?) async throws -> URL {
        let data = try await downloadData(from: remoteString)
        guard let image = UIImage(data: data) else { throw NativeSlideshowSaveError.invalidImageData }

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: image.size, format: format)
        let normalized = renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: image.size))
        }

        guard let cgImage = normalized.cgImage else { throw NativeSlideshowSaveError.unableToCreateImageFile }
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("jpg")

        guard let destination = CGImageDestinationCreateWithURL(outputURL as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw NativeSlideshowSaveError.unableToCreateImageFile
        }

        var properties: [String: Any] = [
            kCGImageDestinationLossyCompressionQuality as String: 0.95
        ]
        if let assetIdentifier {
            properties[kCGImagePropertyMakerAppleDictionary as String] = ["17": assetIdentifier]
        }

        CGImageDestinationAddImage(destination, cgImage, properties as CFDictionary)
        guard CGImageDestinationFinalize(destination) else {
            throw NativeSlideshowSaveError.unableToCreateImageFile
        }

        return outputURL
    }

    static func savePhoto(from remoteString: String) async throws {
        try await requestAddOnlyAuthorization()
        let imageURL = try await makeJPEGPhotoFile(from: remoteString, assetIdentifier: nil)
        defer { try? FileManager.default.removeItem(at: imageURL) }

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                let options = PHAssetResourceCreationOptions()
                options.originalFilename = imageURL.lastPathComponent
                request.addResource(with: .photo, fileURL: imageURL, options: options)
            }, completionHandler: { success, error in
                if let error {
                    continuation.resume(throwing: error)
                } else if success {
                    continuation.resume(returning: ())
                } else {
                    continuation.resume(throwing: NativeAppError.invalidResponse)
                }
            })
        }
    }
}
