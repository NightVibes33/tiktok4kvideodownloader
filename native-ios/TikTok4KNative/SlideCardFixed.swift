import SwiftUI

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
