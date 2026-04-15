import SwiftUI

struct NativeSlideshowDownloaderView: View {
    @StateObject private var model = DownloaderViewModel()
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    urlInput
                    if let error = model.errorMessage {
                        ErrorBanner(message: error)
                    }
                    if model.hasSlideshowResult {
                        resultsHeader
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(model.images, id: \.self) { imageURL in
                                SlideCard(imageURL: imageURL, videoURL: model.videoURL, livePhotoCapable: model.livePhotoCapable) {
                                    await model.savePhoto(imageURL)
                                } saveLiveAction: {
                                    if let videoURL = model.videoURL {
                                        await model.saveLivePhoto(imageRemoteString: imageURL, videoRemoteString: videoURL)
                                    }
                                }
                            }
                        }
                    }
                }
                .padding()
                .frame(maxWidth: 800)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("Slideshows")
        }
    }

    private var urlInput: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Paste a TikTok slideshow URL")
                .font(.headline)
            TextField("https://www.tiktok.com/...", text: $model.url)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .padding()
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            Button(action: { Task { await model.extract() } }) {
                if model.isLoading {
                    ProgressView().frame(maxWidth: .infinity)
                } else {
                    Text("Extract Slideshow").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .cardStyle()
    }

    private var resultsHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(model.images.count) photos found")
                .font(.headline)
            HStack(spacing: 10) {
                Button("Download All Photos") {
                    Task {
                        for imageURL in model.images { await model.savePhoto(imageURL) }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())

                if model.livePhotoCapable, model.videoURL != nil {
                    Button("Download All Live") {
                        Task {
                            guard let videoURL = model.videoURL else { return }
                            for imageURL in model.images {
                                await model.saveLivePhoto(imageRemoteString: imageURL, videoRemoteString: videoURL)
                            }
                        }
                    }
                    .buttonStyle(SecondaryAccentButtonStyle())
                }
            }
        }
        .cardStyle()
    }
}

struct SlideCard: View {
    let imageURL: String
    let videoURL: String?
    let livePhotoCapable: Bool
    let savePhotoAction: () async -> Void
    let saveLiveAction: () async -> Void

    var body: some View {
        VStack(spacing: 10) {
            AsyncImage(url: URL(string: imageURL)) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                case .failure(_):
                    Color.gray.opacity(0.25)
                case .empty:
                    ProgressView()
                @unknown default:
                    Color.gray.opacity(0.25)
                }
            }
            .frame(height: 180)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            Button("Save Photo") { Task { await savePhotoAction() } }
                .buttonStyle(PrimaryButtonStyle())

            if livePhotoCapable, videoURL != nil {
                Button("Save Live Photo") { Task { await saveLiveAction() } }
                    .buttonStyle(SecondaryAccentButtonStyle())
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}
