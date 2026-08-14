import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: object;
}

const configuredBase = (import.meta.env.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");

function siteBaseUrl() {
  if (configuredBase) return configuredBase;
  if (typeof window !== "undefined") {
    const basePath = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");
    return `${window.location.origin}${basePath}`;
  }
  return "https://nightvibes33.github.io/tiktok4kvideodownloader";
}

export default function SEOHead({ title, description, path, jsonLd }: SEOHeadProps) {
  useEffect(() => {
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const setLink = (rel: string, href: string) => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };

    const canonical = `${siteBaseUrl()}${path}`;

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", canonical);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setLink("canonical", canonical);

    const existingLd = document.querySelector("script[data-seo-ld]");
    if (existingLd) existingLd.remove();

    if (jsonLd) {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-ld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      const ld = document.querySelector("script[data-seo-ld]");
      if (ld) ld.remove();
    };
  }, [title, description, path, jsonLd]);

  return null;
}
