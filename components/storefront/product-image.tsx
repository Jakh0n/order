import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  sizes,
  className,
  fit = "cover",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
  /** contain: the whole photo, never zoomed or cut (product window); the sides are a blurred copy */
  fit?: "cover" | "contain";
}) {
  return (
    <div className={cn("bg-muted relative overflow-hidden", className)}>
      {src && fit === "contain" ? (
        <>
          <Image
            src={src}
            alt=""
            aria-hidden
            fill
            sizes={sizes}
            className="scale-110 object-cover opacity-60 blur-2xl"
          />
          <Image src={src} alt={alt} fill sizes={sizes} className="object-contain" />
        </>
      ) : src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="text-muted-foreground/50 flex size-full items-center justify-center">
          <UtensilsCrossed className="size-1/3" aria-hidden />
        </div>
      )}
    </div>
  );
}
