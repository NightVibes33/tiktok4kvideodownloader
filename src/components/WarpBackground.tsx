import { Warp } from "@paper-design/shaders-react";

export default function WarpBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="h-[100svh] w-screen overflow-hidden opacity-60">
        <Warp
          style={{ width: "100%", height: "100%" }}
          colors={[
            "hsl(330, 100%, 65%)",
            "hsl(340, 80%, 45%)",
            "hsl(330, 100%, 65%)",
            "hsl(320, 90%, 55%)",
          ]}
          proportion={0.45}
          softness={1}
          distortion={0.25}
          swirl={0.8}
          swirlIterations={10}
          shape="checks"
          shapeScale={0.1}
          scale={1}
          rotation={0}
          speed={0.65}
        />
      </div>
    </div>
  );
}
