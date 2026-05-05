import SwiftUI

enum AppPalette {
    static let panel = Color.white.opacity(0.08)
    static let panelStrong = Color.white.opacity(0.12)
    static let line = Color.white.opacity(0.10)
    static let pink = Color(red: 1.0, green: 0.29, blue: 0.64)
    static let cyan = Color(red: 0.30, green: 0.92, blue: 0.92)
    static let peach = Color(red: 1.0, green: 0.74, blue: 0.55)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 14)
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity)
            .background(
                LinearGradient(
                    colors: [AppPalette.pink.opacity(configuration.isPressed ? 0.82 : 1.0), AppPalette.peach.opacity(configuration.isPressed ? 0.82 : 1.0)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .shadow(color: AppPalette.pink.opacity(0.24), radius: 18, y: 10)
            .animation(.spring(response: 0.22, dampingFraction: 0.82), value: configuration.isPressed)
    }
}

struct SecondaryAccentButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.vertical, 14)
            .padding(.horizontal, 18)
            .frame(maxWidth: .infinity)
            .background(AppPalette.cyan.opacity(configuration.isPressed ? 0.80 : 0.96))
            .foregroundStyle(.black)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .shadow(color: AppPalette.cyan.opacity(0.18), radius: 16, y: 8)
            .animation(.spring(response: 0.22, dampingFraction: 0.82), value: configuration.isPressed)
    }
}

struct ErrorBanner: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.red.opacity(0.18))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct SuccessBanner: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.subheadline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.green.opacity(0.18))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct AppChrome<Content: View>: View {
    let content: Content
    @State private var glowShift = false

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.07, green: 0.05, blue: 0.12), Color(red: 0.04, green: 0.06, blue: 0.11), Color.black],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            Circle()
                .fill(AppPalette.pink.opacity(0.18))
                .frame(width: 260, height: 260)
                .blur(radius: 40)
                .offset(x: glowShift ? 140 : 110, y: glowShift ? -240 : -270)
                .animation(.easeInOut(duration: 5).repeatForever(autoreverses: true), value: glowShift)

            Circle()
                .fill(AppPalette.cyan.opacity(0.14))
                .frame(width: 280, height: 280)
                .blur(radius: 50)
                .offset(x: glowShift ? -160 : -120, y: glowShift ? -120 : -160)
                .animation(.easeInOut(duration: 6).repeatForever(autoreverses: true), value: glowShift)

            content
        }
        .onAppear { glowShift = true }
    }
}

struct HeroCard<Content: View>: View {
    let eyebrow: String
    let title: String
    let subtitle: String
    let content: Content

    init(eyebrow: String, title: String, subtitle: String, @ViewBuilder content: () -> Content) {
        self.eyebrow = eyebrow
        self.title = title
        self.subtitle = subtitle
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                Text(eyebrow.uppercased())
                    .font(.caption.weight(.semibold))
                    .tracking(2)
                    .foregroundStyle(AppPalette.cyan)
                Text(title)
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.75))
            }
            content
        }
        .glassSurface(cornerRadius: 28)
    }
}

struct FloatingResultCard<Content: View>: View {
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        content
            .glassSurface(cornerRadius: 24)
            .shadow(color: Color.black.opacity(0.18), radius: 22, y: 14)
    }
}

struct LiquidGlassGroup<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    init(spacing: CGFloat, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        if #available(iOS 26.0, *) {
            GlassEffectContainer(spacing: spacing) {
                content
            }
        } else {
            content
        }
    }
}

struct LiquidGlassCapsule<Content: View>: View {
    let paddingX: CGFloat
    let paddingY: CGFloat
    let content: Content

    init(paddingX: CGFloat = 14, paddingY: CGFloat = 12, @ViewBuilder content: () -> Content) {
        self.paddingX = paddingX
        self.paddingY = paddingY
        self.content = content()
    }

    var body: some View {
        if #available(iOS 26.0, *) {
            content
                .padding(.horizontal, paddingX)
                .padding(.vertical, paddingY)
                .background(Color.white.opacity(0.001))
                .glassEffect(.regular, in: Capsule())
        } else {
            content
                .padding(.horizontal, paddingX)
                .padding(.vertical, paddingY)
                .background(AppPalette.panelStrong)
                .clipShape(Capsule())
        }
    }
}

struct MotionReveal: ViewModifier {
    let delay: Double
    @State private var visible = false

    func body(content: Content) -> some View {
        content
            .opacity(visible ? 1 : 0)
            .offset(y: visible ? 0 : 14)
            .scaleEffect(visible ? 1 : 0.985)
            .onAppear {
                withAnimation(.spring(response: 0.55, dampingFraction: 0.86).delay(delay)) {
                    visible = true
                }
            }
    }
}

struct GlassSurfaceModifier: ViewModifier {
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        if #available(iOS 26.0, *) {
            content
                .padding(18)
                .background(AppPalette.panel.opacity(0.001))
                .glassEffect(.regular, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(Color.white.opacity(0.18), lineWidth: 0.8)
                )
        } else {
            content
                .padding(18)
                .background(AppPalette.panel)
                .overlay(
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(AppPalette.line, lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
    }
}

extension View {
    func cardStyle() -> some View { glassSurface(cornerRadius: 20) }
    func motionReveal(delay: Double = 0) -> some View { modifier(MotionReveal(delay: delay)) }
    func glassSurface(cornerRadius: CGFloat) -> some View { modifier(GlassSurfaceModifier(cornerRadius: cornerRadius)) }
}
