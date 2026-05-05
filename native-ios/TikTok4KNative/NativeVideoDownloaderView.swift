import SwiftUI

struct NativeVideoDownloaderView: View {
    @StateObject private var model = DownloaderViewModel()

    var body: some View {
        NavigationStack {
            AppChrome {
                ScrollView {
                    VStack(spacing: 18) {
                        HeroCard(
                            eyebrow: "Video",
                            title: "Pull the cleanest TikTok file available",
                            subtitle: "Paste a link, extract, and send the result straight into the iOS share sheet."
                        ) {
                            urlInput
                        }
                        .motionReveal()

                        if let success = model.successMessage {
                            SuccessBanner(message: success)
                                .motionReveal(delay: 0.05)
                        }
                        if let error = model.errorMessage {
                            ErrorBanner(message: error)
                                .motionReveal(delay: 0.05)
                        }
                        if model.hasVideoResult, let urlString = model.videoURL, let url = URL(string: urlString) {
                            FloatingResultCard {
                                VStack(alignment: .leading, spacing: 14) {
                                    HStack {
                                        VStack(alignment: .leading, spacing: 4) {
                                            Text("Video ready")
                                                .font(.headline)
                                                .foregroundStyle(.white)
                                            Text("Native share handoff is ready")
                                                .font(.footnote)
                                                .foregroundStyle(.white.opacity(0.7))
                                        }
                                        Spacer()
                                        Image(systemName: "play.circle.fill")
                                            .font(.system(size: 30))
                                            .foregroundStyle(AppPalette.peach)
                                    }

                                    ShareLink(item: url) {
                                        Label("Share or Download Video", systemImage: "arrow.down.circle.fill")
                                    }
                                    .buttonStyle(PrimaryButtonStyle())

                                    Text("This native screen reuses the same backend response as the web app, but with a cleaner iOS result state and share flow.")
                                        .font(.footnote)
                                        .foregroundStyle(.white.opacity(0.7))
                                }
                            }
                            .motionReveal(delay: 0.08)
                        }
                    }
                    .padding()
                    .frame(maxWidth: 720)
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Videos")
        }
    }

    private var urlInput: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Paste a TikTok video URL")
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
                    Label("Extract Video", systemImage: "sparkles")
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
    }
}
