import Foundation
import Photos
import SwiftUI

struct AppConfig {
    static let appName = "TikTok 4K"
    static let supabaseURL = URL(string: "https://ejqqrsxnxunfnmjwtrcp.supabase.co")!
    static let publishableKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVqcXFyc3hueHVuZm5tand0cmNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjM2NDgsImV4cCI6MjA4OTMzOTY0OH0.U9dzZwSZNc9dks9eRp-zAihHnc8-ucFg3Dbskt4Cco4"
}

struct ScraperVideo: Codable, Hashable {
    let url: String?
    let duration: Int?
    let width: Int?
    let height: Int?
}

struct ScraperResponse: Codable, Hashable {
    let images: [String]?
    let video: ScraperVideo?
    let livePhotoCapable: Bool?
    let error: String?
}

enum NativeAppError: LocalizedError {
    case invalidURL
    case invalidResponse
    case backend(String)
    case photosPermissionDenied
    case missingRemoteAsset

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Please paste a valid TikTok URL."
        case .invalidResponse: return "The server returned an invalid response."
        case .backend(let message): return message
        case .photosPermissionDenied: return "Photo Library permission is required to save content."
        case .missingRemoteAsset: return "The remote media asset is unavailable."
        }
    }
}

struct EdgeFunctionClient {
    func scrapeTikTok(url: String) async throws -> ScraperResponse {
        let endpoint = AppConfig.supabaseURL.appendingPathComponent("functions/v1/tiktok-scraper")
        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(AppConfig.publishableKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(AppConfig.publishableKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["url": url])

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw NativeAppError.invalidResponse
        }
        let decoded = try JSONDecoder().decode(ScraperResponse.self, from: data)
        if let error = decoded.error, !error.isEmpty { throw NativeAppError.backend(error) }
        return decoded
    }
}

enum PhotoLibrarySaver {
    static func requestAddOnlyAuthorization() async throws {
        let status = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        if status == .authorized || status == .limited { return }
        let newStatus = await withCheckedContinuation { continuation in
            PHPhotoLibrary.requestAuthorization(for: .addOnly) { continuation.resume(returning: $0) }
        }
        guard newStatus == .authorized || newStatus == .limited else {
            throw NativeAppError.photosPermissionDenied
        }
    }

    static func downloadTempFile(from remoteString: String, suggestedExtension: String) async throws -> URL {
        guard let url = URL(string: remoteString) else { throw NativeAppError.invalidURL }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw NativeAppError.missingRemoteAsset }
        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString).appendingPathExtension(suggestedExtension)
        try data.write(to: tempURL, options: .atomic)
        return tempURL
    }

    static func saveImage(from remoteString: String) async throws {
        try await requestAddOnlyAuthorization()
        let imageURL = try await downloadTempFile(from: remoteString, suggestedExtension: "jpg")
        try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, fileURL: imageURL, options: nil)
            }, completionHandler: { success, error in
                if let error { continuation.resume(throwing: error) }
                else if success { continuation.resume(returning: ()) }
                else { continuation.resume(throwing: NativeAppError.invalidResponse) }
            })
        }
    }

    static func saveLivePhoto(imageRemoteString: String, videoRemoteString: String) async throws {
        try await requestAddOnlyAuthorization()
        let imageURL = try await downloadTempFile(from: imageRemoteString, suggestedExtension: "jpg")
        let videoURL = try await downloadTempFile(from: videoRemoteString, suggestedExtension: "mov")
        try await withCheckedThrowingContinuation { continuation in
            PHPhotoLibrary.shared().performChanges({
                let request = PHAssetCreationRequest.forAsset()
                request.addResource(with: .photo, fileURL: imageURL, options: nil)
                request.addResource(with: .pairedVideo, fileURL: videoURL, options: nil)
            }, completionHandler: { success, error in
                if let error { continuation.resume(throwing: error) }
                else if success { continuation.resume(returning: ()) }
                else { continuation.resume(throwing: NativeAppError.invalidResponse) }
            })
        }
    }
}

@MainActor
final class DownloaderViewModel: ObservableObject {
    @Published var url = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var images: [String] = []
    @Published var videoURL: String?
    @Published var livePhotoCapable = false

    private let client = EdgeFunctionClient()

    func extract() async {
        guard url.lowercased().contains("tiktok.com") else {
            errorMessage = NativeAppError.invalidURL.localizedDescription
            return
        }
        isLoading = true
        errorMessage = nil
        images = []
        videoURL = nil
        livePhotoCapable = false
        do {
            let response = try await client.scrapeTikTok(url: url)
            images = response.images ?? []
            videoURL = response.video?.url
            livePhotoCapable = response.livePhotoCapable ?? (response.video?.url != nil)
            if images.isEmpty && videoURL == nil {
                throw NativeAppError.invalidResponse
            }
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
        isLoading = false
    }

    func savePhoto(_ remoteString: String) async {
        do { try await PhotoLibrarySaver.saveImage(from: remoteString) }
        catch { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
    }

    func saveLivePhoto(imageRemoteString: String, videoRemoteString: String) async {
        do { try await PhotoLibrarySaver.saveLivePhoto(imageRemoteString: imageRemoteString, videoRemoteString: videoRemoteString) }
        catch { errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription }
    }

    var hasVideoResult: Bool { videoURL != nil && images.isEmpty }
    var hasSlideshowResult: Bool { !images.isEmpty }
}
