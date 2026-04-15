import SwiftUI

struct NativeSettingsView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("App") {
                    HStack {
                        Image(systemName: "app.badge.fill")
                            .foregroundStyle(.pink)
                        VStack(alignment: .leading) {
                            Text("TikTok 4K")
                            Text("Native SwiftUI app")
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                    }
                    LabeledContent("Backend", value: "Shared Supabase")
                    LabeledContent("Web app", value: "Lovable + Vercel")
                    LabeledContent("IPA path", value: "Native iOS SwiftUI")
                }

                Section("Capabilities") {
                    Label("Native slideshow photo save", systemImage: "photo")
                    Label("Native Live Photo save", systemImage: "livephoto")
                    Label("Shared backend responses", systemImage: "arrow.triangle.branch")
                }

                Section("Notes") {
                    Text("This native app lives alongside the existing web app. Both experiences stay linked through the same backend and branding, but the iOS app can use native Photo Library flows that the website cannot.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
        }
    }
}
