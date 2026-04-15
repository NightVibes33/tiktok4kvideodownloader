import SwiftUI

struct RootTabView: View {
    var body: some View {
        TabView {
            NativeHomeView()
                .tabItem { Label("Home", systemImage: "house.fill") }

            NativeVideoDownloaderView()
                .tabItem { Label("Videos", systemImage: "play.rectangle.fill") }

            NativeSlideshowDownloaderView()
                .tabItem { Label("Slideshows", systemImage: "photo.on.rectangle.angled") }

            NativeSettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape.fill") }
        }
        .tint(.pink)
    }
}

struct NativeHomeView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 10) {
                        Image(systemName: "sparkles.tv")
                            .font(.system(size: 42, weight: .bold))
                            .foregroundStyle(.pink)
                        Text("TikTok 4K Downloader")
                            .font(.largeTitle.bold())
                            .multilineTextAlignment(.center)
                        Text("Native iPhone and iPad app linked to the same Supabase backend as the web version.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 24)

                    VStack(spacing: 14) {
                        FeatureCard(icon: "play.rectangle.fill", title: "Video Downloader", subtitle: "Native screen using the same backend flow.")
                        FeatureCard(icon: "photo.on.rectangle.angled", title: "Slideshow Downloader", subtitle: "Native photo save plus Live Photo save in the same app.")
                        FeatureCard(icon: "icloud.and.arrow.down", title: "Shared Backend", subtitle: "Lovable, Vercel, and IPA all stay linked through Supabase.")
                        FeatureCard(icon: "gearshape.fill", title: "Native Settings", subtitle: "App details, capabilities, and future device-specific controls.")
                    }
                }
                .padding()
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Color(.systemBackground))
            .navigationTitle("Home")
        }
    }
}

struct FeatureCard: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.pink)
                .frame(width: 42, height: 42)
                .background(Color.pink.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline)
                Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
            }
            Spacer()
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
