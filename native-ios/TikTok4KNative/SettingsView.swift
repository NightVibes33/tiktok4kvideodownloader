import SwiftUI

struct NativeSettingsView: View {
    var body: some View {
        NavigationStack {
            AppChrome {
                ScrollView {
                    VStack(spacing: 18) {
                        HeroCard(
                            eyebrow: "Settings",
                            title: "Native iPhone build, not just a wrapped website",
                            subtitle: "This build shares the backend with the web app, but uses native Photos flows and Live Photo-aware save logic."
                        ) {
                            HStack(spacing: 12) {
                                PillMetric(value: "IPA", label: "native")
                                PillMetric(value: "Sync", label: "backend")
                                PillMetric(value: "Live", label: "photos")
                            }
                        }

                        VStack(spacing: 14) {
                            SettingsPanel(
                                title: "App",
                                items: [
                                    SettingsItem(icon: "app.badge.fill", label: "Product", value: "TikTok 4K"),
                                    SettingsItem(icon: "iphone.gen3", label: "Experience", value: "Native SwiftUI"),
                                    SettingsItem(icon: "sparkles.tv", label: "Style", value: "iPhone-first UI")
                                ]
                            )

                            SettingsPanel(
                                title: "Stack",
                                items: [
                                    SettingsItem(icon: "server.rack", label: "Backend", value: "Shared Supabase"),
                                    SettingsItem(icon: "globe", label: "Web app", value: "Lovable + Vercel"),
                                    SettingsItem(icon: "square.stack.3d.up.fill", label: "IPA path", value: "Native iOS SwiftUI")
                                ]
                            )

                            SettingsPanel(
                                title: "Capabilities",
                                items: [
                                    SettingsItem(icon: "photo", label: "Photo save", value: "Native Photos"),
                                    SettingsItem(icon: "livephoto", label: "Live Photo save", value: "Per-slide motion only"),
                                    SettingsItem(icon: "arrow.triangle.branch", label: "Backend data", value: "Shared responses")
                                ]
                            )
                        }

                        VStack(alignment: .leading, spacing: 10) {
                            Text("Notes")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Text("A real iOS Live Photo requires a still image plus its own paired motion asset. This app only offers Live Photo save when the source post includes that per-slide motion data.")
                                .font(.footnote)
                                .foregroundStyle(.white.opacity(0.72))
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .cardStyle()
                    }
                    .padding()
                    .frame(maxWidth: 720)
                    .frame(maxWidth: .infinity)
                }
            }
            .navigationTitle("Settings")
        }
    }
}

struct SettingsItem: Hashable {
    let icon: String
    let label: String
    let value: String
}

struct SettingsPanel: View {
    let title: String
    let items: [SettingsItem]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(title)
                .font(.headline)
                .foregroundStyle(.white)

            ForEach(items, id: \.self) { item in
                HStack(spacing: 14) {
                    Image(systemName: item.icon)
                        .frame(width: 38, height: 38)
                        .background(AppPalette.panelStrong)
                        .foregroundStyle(AppPalette.cyan)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.label)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white)
                        Text(item.value)
                            .font(.footnote)
                            .foregroundStyle(.white.opacity(0.68))
                    }

                    Spacer()
                }
            }
        }
        .cardStyle()
    }
}
