"use client"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { useIsMobile } from "@/hooks/useMobile"
import { cn } from "@/lib/utils"
import { ImageOff } from "lucide-react"
import { motion } from "motion/react"
import Image from "next/image"
import { useRef, useState, useCallback } from "react"

const MotionNextImage = motion(Image)

function NoImagePlaceholder() {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-t-xl bg-muted">
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        <ImageOff className="h-8 w-8" />
        <p className="text-sm font-medium">No Image</p>
      </div>
    </div>
  )
}

function ProductCarousel({ img, name }: { img: string[]; name: string }) {
  const isMobile = useIsMobile()
  const [api, setApi] = useState<CarouselApi>()
  const [activeIndex, setActiveIndex] = useState(0)
  const refObj = useRef(null)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!api || img.length <= 1) return
      const { left, width } = e.currentTarget.getBoundingClientRect()
      const perc = ((e.clientX - left) / width) * 100
      const singPerc = 100 / img.length
      const partPerc = Math.floor(perc / singPerc)
      const clamped = Math.max(0, Math.min(partPerc, img.length - 1))
      if (clamped !== activeIndex) {
        api.scrollTo(clamped)
        setActiveIndex(clamped)
      }
    },
    [api, img.length, activeIndex]
  )

  const handleThumbnailClick = useCallback(
    (index: number) => {
      api?.scrollTo(index)
      setActiveIndex(index)
    },
    [api]
  )

  const hasImages = img.length > 0

  return (
    <div className="group/carousel relative select-none">
      {/* Main carousel */}
      <div className="relative">
        <div
          onClick={() => {
            if (api?.canScrollPrev()) {
              api?.scrollPrev()
              setActiveIndex((val) => val - 1)
            }
          }}
          className={cn(
            "absolute top-0 left-0 z-10 h-full w-1/2",
            isMobile ? "pointer-events-auto" : "pointer-events-none"
          )}
        />
        <div
          onClick={() => {
            if (api?.canScrollNext()) {
              api?.scrollNext()
              setActiveIndex((val) => val + 1)
            }
          }}
          className={cn(
            "absolute top-0 right-0 z-10 h-full w-1/2",
            isMobile ? "pointer-events-auto" : "pointer-events-none"
          )}
        />
        <Carousel
          setApi={setApi}
          opts={{
            watchDrag: false,
          }}
          ref={refObj}
          onMouseMove={handleMouseMove}
        >
          <CarouselContent className="relative">
            {hasImages ? (
              img.map((src, index) => (
                <CarouselItem key={index}>
                  <MotionNextImage
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    width={400}
                    height={400}
                    alt={`${name} – view ${index + 1} of ${img.length}`}
                    src={src}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="aspect-square w-full rounded-t-xl object-cover transition-transform duration-300 group-hover/carousel:scale-105"
                  />
                </CarouselItem>
              ))
            ) : (
              <CarouselItem>
                <NoImagePlaceholder />
              </CarouselItem>
            )}
          </CarouselContent>
        </Carousel>
      </div>

      {/* Dot indicators (when ≤ 6 images) */}
      {hasImages && img.length > 1 && (
        <div className="absolute right-0 bottom-0 left-0 flex items-center justify-center">
          <div className="m-2 flex w-fit items-center justify-center gap-1.5 rounded-full bg-black/50 p-2 py-1.5 backdrop-blur-2xl backdrop-brightness-150">
            {img.map((_, index) => (
              <button
                key={index}
                onClick={() => handleThumbnailClick(index)}
                aria-label={`Go to image ${index + 1}`}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  index === activeIndex
                    ? "w-4 bg-primary"
                    : "w-1.5 bg-white/60 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProductCarousel
