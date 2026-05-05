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
                            title: "A downloader that feels designed for iPhone, not ported to it",
                            subtitle: "Fast TikTok video saves, cleaner slideshow handling, and honest Live Photo behavior when motion-backed slides actually exist."
                        ) {
                            VStack(spacing: 16) {
                                HStack(spacing: 12) {
                                    PillMetric(value: "4K", label: "video")
                                    PillMetric(value: "HD", label: "slides")
                                    PillMetric(value: "Live", label: "photo")
                                }

                                HStack(spacing: 12) {
                                    SpotlightTile(
                                        icon: "play.rectangle.fill",
                                        title: "Video flow",
                                        subtitle: "Extract clean files and hand them off to the native iOS share sheet.",
                                        accent: AppPalette.pink
                                    )
                                    SpotlightTile(
                                        icon: "livephoto",
                                        title: "Live Photo aware",
                                        subtitle: "Only expose Live Photo save when a slide has its own motion asset.",
                                        accent: AppPalette.cyan
                                    )
                                }
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            SectionEyebrow(title: "What’s inside")
                            VStack(spacing: 14) {
                                FeatureCard(icon: "play.rectangle.fill", title: "Video Downloader", subtitle: "One-tap extraction with a sharper native handoff for saving and sharing.")
                                FeatureCard(icon: "photo.on.rectangle.angled", title: "Slideshow Downloader", subtitle: "Separate still slides from motion-backed Live Photo slides instead of mixing them together.")
                                FeatureCard(icon: "sparkles.rectangle.stack.fill", title: "Live Photo Aware", subtitle: "The app now follows Apple’s asset model more closely instead of pretending one shared slideshow movie can power every slide.")
                            }
                        }

                        VStack(alignment: .leading, spacing: 12) {
                            SectionEyebrow(title: "Why it feels better")
                            HStack(spacing: 12) {
                                NarrativeCard(
                                    step: "01",
                                    title: "Clearer structure",
                                    body: "The app now reads like a product, with stronger hierarchy and less placeholder utility styling."
                                )
                                NarrativeCard(
                                    step: "02",
                                    title: "Better trust",
                                    body: "The slideshow screen tells the truth about which slides can become Live Photos on iOS."
                                )
                            }
                            HStack(spacing: 12) {
                                NarrativeCard(
                                    step: "03",
                                    title: "Native feel",
                                    body: "Glass panels, deeper contrast, and cleaner spacing make the IPA feel less generic."
                                )
                                NarrativeCard(
                                    step: "04",
                                    title: "Shared backend",
                                    body: "The native app stays aligned with the same scraper/backend responses as the web product."
                                )
                            }
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

struct SpotlightTile: View {
    let icon: String
    let title: String
    let subtitle: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(systemName: icon)
                .font(.headline.weight(.bold))
                .foregroundStyle(.black)
                .frame(width: 34, height: 34)
                .background(accent)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.72))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppPalette.panelStrong)
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}

struct SectionEyebrow: View {
    let title: String

    var body: some View {
        Text(title.uppercased())
            .font(.caption.weight(.semibold))
            .tracking(2)
            .foregroundStyle(AppPalette.cyan)
            .padding(.horizontal, 4)
    }
}

struct NarrativeCard: View {
    let step: String
    let title: String
    let copy: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(step)
                .font(.caption.weight(.bold))
                .tracking(2)
                .foregroundStyle(AppPalette.peach)
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)
            Text(copy)
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(AppPalette.panel)
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(AppPalette.line, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
    }
}
