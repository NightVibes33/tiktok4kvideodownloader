import { Coffee } from "lucide-react";

export default function BuyMeCoffee() {
  return (
    <div className="flex justify-center mt-8">
      <a
        href="https://buymeacoffee.com/ZYN3"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[hsl(45,100%,51%)] hover:bg-[hsl(45,100%,45%)] text-[hsl(0,0%,10%)] font-medium text-sm transition-colors duration-200 shadow-md"
      >
        <Coffee className="w-4 h-4" />
        Buy me a coffee
      </a>
    </div>
  );
}
