import SwiftUI

struct NativeSlideshowDownloaderView: View {
    @StateObject private var model = DownloaderViewModel()
    private let columns = [GridItem(.flexible()), GridItem(.flexible())]

    var body: some View {
        NavigationStack {
            AppChrome {
                ScrollView {
                    VStack(spacing: 18) {
                        HeroCard(
                            eyebrow: "Slideshows",
                            title: "Separate still slides from real Live Photos",
                            subtitle: "This screen only offers native Live Photo save when a specific slide comes with its own motion asset."
                        ) {
                            urlInput
                        }

                        if let success = model.successMessage {
                            SuccessBanner(message: success)
                        }
                        if let error = model.errorMessage {
                            ErrorBanner(message: error)
                        }
                        if model.hasSlideshowResult {
                            resultsHeader
                            LazyVGrid(columns: columns, spacing: 12) {
                                ForEach(Array(model.livePhotoItems.enumerated()), id: \.offset) { index, item in
                                    SlideCard(index: index + 1, item: item) {
                                        await model.savePhoto(item.image)
                                    } saveLiveAction: {
                                        if let motion = item.motion {
                                            await model.saveLivePhoto(imageRemoteString: item.image, videoRemoteString: motion)
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
            }
            .navigationTitle("Slideshows")
        }
    }

    private var urlInput: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Paste a TikTok slideshow URL")
                .font(.headline)
                .foregroundStyle(.white)
            TextField("https://www.tiktok.com/...", text: $model.url)
                .textInputAutocapitalization(.never)
                .keyboardType(.URL)
                .autocorrectionDisabled()
                .padding()
                .background(AppPalette.panelStrong)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            Button(action: { Task { await model.extract() } }) {
                if model.isLoading {
                    ProgressView().tint(.white)
                } else {
                    Label("Extract Slideshow", systemImage: "photo.stack")
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }

    private var resultsHeader: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("\(model.images.count) slides found")
                .font(.headline)
                .foregroundStyle(.white)
            Text("\(model.livePhotoReadyItems.count) slides include motion and can be saved as native Live Photos.")
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.7))
            HStack(spacing: 10) {
                Button("Save All Photos") {
                    Task {
                        for imageURL in model.images { await model.savePhoto(imageURL) }
                    }
                }
                .buttonStyle(PrimaryButtonStyle())

                if !model.livePhotoReadyItems.isEmpty {
                    Button("Save Live Photos") {
                        Task {
                            for item in model.livePhotoReadyItems {
                                if let motion = item.motion {
                                    await model.saveLivePhoto(imageRemoteString: item.image, videoRemoteString: motion)
                                }
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
    let index: Int
    let item: ScraperLivePhotoItem
    let savePhotoAction: () async -> Void
    let saveLiveAction: () async -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            AsyncImage(url: URL(string: item.image)) { phase in
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
            .frame(height: 220)
            .frame(maxWidth: .infinity)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(alignment: .topLeading) {
                Text("SLIDE \(index)")
                    .font(.caption2.weight(.bold))
                    .tracking(1.5)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.45))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                    .padding(12)
            }

            HStack {
                Text(item.motion == nil ? "Still photo" : "Motion-backed Live Photo")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                Spacer()
                Image(systemName: item.motion == nil ? "photo" : "livephoto")
                    .foregroundStyle(item.motion == nil ? AppPalette.peach : AppPalette.cyan)
            }

            Button("Save Photo") { Task { await savePhotoAction() } }
                .buttonStyle(PrimaryButtonStyle())

            if item.motion != nil {
                Button("Save Live Photo") { Task { await saveLiveAction() } }
                    .buttonStyle(SecondaryAccentButtonStyle())
            }
        }
        .cardStyle()
    }
}
