import SwiftUI

struct NativeVideoDownloaderView: View {
    @StateObject private var model = DownloaderViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    urlInput
                    if let error = model.errorMessage {
                        ErrorBanner(message: error)
                    }
                    if model.hasVideoResult, let urlString = model.videoURL, let url = URL(string: urlString) {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Video ready")
                                .font(.headline)
                            ShareLink(item: url) {
                                Text("Share / Download Video")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(PrimaryButtonStyle())
                            Text("This native screen uses the same backend response as the web app.")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        .cardStyle()
                    }
                }
                .padding()
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .navigationTitle("Videos")
        }
    }

    private var urlInput: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Paste a TikTok video URL")
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
                    Text("Extract Video").frame(maxWidth: .infinity)
                }
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .cardStyle()
    }
}
