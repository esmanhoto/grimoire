import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function ZoomableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button type="button" className="block w-full cursor-zoom-in" aria-label={`Enlarge ${alt}`}>
          <img
            src={src}
            alt={alt}
            className={cn("w-full max-h-[32rem] object-contain rounded-lg border border-primary/30 bg-black/30", className)}
          />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/85 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] grid place-items-center p-4 cursor-zoom-out focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <DialogPrimitive.Close asChild>
            <img src={src} alt={alt} className="h-[94vh] w-[94vw] object-contain drop-shadow-2xl" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
