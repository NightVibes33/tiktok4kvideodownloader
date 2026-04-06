import { Suspense } from "react";
import { Warp } from "@paper-design/shaders-react";

export default function WarpBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
    >
      <div className="h-[100svh] w-screen overflow-hidden opacity-60">
        <Suspense fallback={<div className="h-full w-full bg-background" />}>
          <Warp
            style={{ width: "100%", height: "100%" }}
            colors={[
              "hsl(330, 100%, 70%)",
              "hsl(340, 100%, 58%)",
              "hsl(325, 100%, 72%)",
              "hsl(335, 100%, 62%)",
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
        </Suspense>
      </div>
    </div>
  );
}
