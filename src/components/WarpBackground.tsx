import { useEffect, useState } from "react";
import { Warp } from "@paper-design/shaders-react";

const SHADER_ERROR_MATCHERS = ["Paper Shaders", "u_noiseTexture"];

const shouldDisableShader = (reason: unknown) => {
  const message =
    typeof reason === "string"
      ? reason
      : reason instanceof Error
        ? reason.message
        : typeof reason === "object" && reason !== null && "message" in reason
          ? String((reason as { message?: unknown }).message)
          : "";

  return SHADER_ERROR_MATCHERS.some((matcher) => message.includes(matcher));
};

export default function WarpBackground() {
  const [isReady, setIsReady] = useState(false);
  const [isDisabled, setIsDisabled] = useState(false);

  useEffect(() => {
    let timeoutId: number | null = null;

    const markReady = () => {
      timeoutId = window.setTimeout(() => setIsReady(true), 150);
    };

    if (document.readyState === "complete") {
      markReady();
    } else {
      window.addEventListener("load", markReady, { once: true });
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!shouldDisableShader(event.reason)) return;

      event.preventDefault();
      setIsDisabled(true);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("load", markReady);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.32),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--background))_35%,hsl(var(--primary)/0.18)_100%)]"
    >
      {!isDisabled && isReady ? (
        <div className="h-[100svh] w-screen opacity-60">
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
            speed={0.25}
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
      ) : null}
    </div>
  );
}