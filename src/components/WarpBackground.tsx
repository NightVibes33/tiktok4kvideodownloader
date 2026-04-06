import { Warp } from "@paper-design/shaders-react";

export default function WarpBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.32),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))_35%,hsl(var(--primary)/0.18)_100%)]"
    >
      <div className="h-[100svh] w-screen overflow-hidden opacity-60">
        <Warp
          style={{ width: "100%", height: "100%" }}
          proportion={0.5}
          softness={3.0}
          distortion={0.08}
          swirl={0.25}
          swirlIterations={14}
          shape="checks"
          shapeScale={0.04}
          scale={2.0}
          rotation={0}
          speed={0.65}
          colors={[
            "hsl(330, 100%, 65%)",
            "hsl(330, 100%, 65%)",
            "hsl(330, 100%, 65%)",
            "hsl(330, 100%, 65%)",
            "hsl(330, 100%, 65%)",
            "hsl(330, 100%, 65%)",
          ]}
        />
      </div>
    </div>
  );
}