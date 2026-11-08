import { UtensilsCrossed } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

export function ProductImage({
  src,
  alt,
  sizes,
  className,
}: {
  src: string | null;
  alt: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div className={cn("bg-muted relative overflow-hidden", className)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="text-muted-foreground/50 flex size-full items-center justify-center">
          <UtensilsCrossed className="size-1/3" aria-hidden />
        </div>
      )}
    </div>
  );
}
