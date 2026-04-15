import Foundation
import SwiftUI

@MainActor
final class NativeSlideshowViewModel: ObservableObject {
    @Published var url = ""
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var successMessage: String?
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
        successMessage = nil
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
        do {
            try await NativeSlideshowImageSupport.savePhoto(from: remoteString)
            errorMessage = nil
            successMessage = "Photo saved to your library."
        } catch {
            successMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    func saveLivePhoto(imageRemoteString: String, videoRemoteString: String) async {
        do {
            try await NativeLivePhotoWriter.saveLivePhoto(imageRemoteString: imageRemoteString, videoRemoteString: videoRemoteString)
            errorMessage = nil
            successMessage = "Live Photo saved to your library."
        } catch {
            successMessage = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    var hasSlideshowResult: Bool { !images.isEmpty }
}
