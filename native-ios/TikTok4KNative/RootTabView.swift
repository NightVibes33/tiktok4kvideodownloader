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
        .tint(AppPalette.pink)
    }
}

struct NativeHomeView: View {
    var body: some View {
        NavigationStack {
            AppChrome {
                ScrollView {
                    VStack(spacing: 20) {
                        HeroCard(
                            eyebrow: "Native iOS",
                            title: "TikTok downloads that feel like an actual iPhone app",
                            subtitle: "Fast video saves, clean slideshow extraction, and proper Live Photo handling when a post includes motion assets."
                        ) {
                            HStack(spacing: 12) {
                                PillMetric(value: "4K", label: "video")
                                PillMetric(value: "HD", label: "slides")
                                PillMetric(value: "Live", label: "photo")
                            }
                        }

                        VStack(spacing: 14) {
                            FeatureCard(icon: "play.rectangle.fill", title: "Video Downloader", subtitle: "One-tap extraction and native share flow for MP4 saves.")
                            FeatureCard(icon: "photo.on.rectangle.angled", title: "Slideshow Downloader", subtitle: "Separate still slides from motion-backed Live Photo slides.")
                            FeatureCard(icon: "sparkles.rectangle.stack.fill", title: "Live Photo Aware", subtitle: "Only offers Live Photo save when the source post includes a paired motion asset.")
                            FeatureCard(icon: "lock.iphone", title: "iPhone-First Polish", subtitle: "Glass cards, better hierarchy, and clearer status feedback.")
                        }
                    }
                    .padding()
                    .frame(maxWidth: 720)
                    .frame(maxWidth: .infinity)
                }
            }
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
                .foregroundStyle(.white)
                .frame(width: 48, height: 48)
                .background(
                    LinearGradient(colors: [AppPalette.pink, AppPalette.cyan], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            VStack(alignment: .leading, spacing: 4) {
                Text(title).font(.headline).foregroundStyle(.white)
                Text(subtitle).font(.subheadline).foregroundStyle(.white.opacity(0.7))
            }
            Spacer()
        }
        .cardStyle()
    }
}

struct PillMetric: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
            Text(label.uppercased())
                .font(.caption2.weight(.semibold))
                .tracking(1.6)
                .foregroundStyle(.white.opacity(0.65))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(AppPalette.panelStrong)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
