import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export default function AdBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // ad blocker or script not loaded
    }
  }, []);

  return (
    <div ref={adRef} className="w-full flex justify-center mt-8">
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", maxWidth: 728, height: 90 }}
        data-ad-client="ca-pub-4235657150182076"
        data-ad-slot="auto"
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
