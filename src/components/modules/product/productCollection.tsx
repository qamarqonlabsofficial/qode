"use client"
import * as motion from "motion/react-client"
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import Product from "./product"
import { type Product as ProductType } from "@/types/product"
import { ChevronLeft, ChevronRight, PackageSearch } from "lucide-react"
import { use, useState } from "react"
import { getProducts } from "@/db/getProducts"
import { MotionSection } from "@/components/motionComp"

export type ProductFilter = {
  category?: string
  brand?: string
  featured?: boolean
  minPrice?: number
  maxPrice?: number
  search?: string
  tags?: string[]
}

interface ProductCollectionProps {
  title: string
  description?: string
  cta?: string
  link?: string
  filters?: ProductFilter
  products: ProductType[]
}

function applyFilters(products: ProductType[], filters?: ProductFilter) {
  if (!filters) return products

  return products.filter((p) => {
    // Category
    if (filters.category && (p as Product).category !== filters.category)
      return false

    // Brand
    if (filters.brand && (p as Product).brand !== filters.brand) return false

    // Featured
    if (filters.featured && !(p as Product).featured) return false

    // Price range (now actually applied)
    const price = parseFloat((p as Product).salePrice ?? p.realPrice)
    if (filters.minPrice !== undefined && price < filters.minPrice) return false
    if (filters.maxPrice !== undefined && price > filters.maxPrice) return false

    // Tags (any match)
    if (filters.tags && filters.tags.length > 0) {
      const pTags: string[] = (p as Product).tags ?? []
      const hasTag = filters.tags.some((t) => pTags.includes(t))
      if (!hasTag) return false
    }

    // Full-text search across name + description
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const match =
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      if (!match) return false
    }

    return true
  })
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 py-16 text-center text-white/50">
      <PackageSearch className="h-10 w-10 opacity-40" />
      <p className="text-sm font-medium">
        No products found in &quot;{title}&quot;
      </p>
      <p className="text-xs text-white/30">Try adjusting your filters</p>
    </div>
  )
}

export default function ProductCollection({
  // Pure presentational component — receives already-fetched products as a prop.
  // No data fetching here; that lives in getProducts.ts / productActions.ts.
  // Can be used in both server and client contexts.
  title,
  description,
  link = "/shop",
  filters,
  products,
}: ProductCollectionProps) {
  const filteredProducts = products
  const isEmpty = filteredProducts.length === 0
  const [api, setApi] = useState<CarouselApi>()

  return (
    <MotionSection
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-60px" }}
      className="w-full py-16"
    >
      <div className="container mx-auto space-y-8 px-4">
        {/* Header */}
        <div className="flex justify-between gap-4">
          <div className="max-w-xl space-y-1.5">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {title}
            </h2>
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
            {/* Result count */}
            {!isEmpty && (
              <p className="text-xs text-muted-foreground/60">
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "item" : "items"}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="default"
              className="rounded-full"
              size="icon-lg"
              onClick={() => {
                api?.scrollPrev()
              }}
            >
              <ChevronLeft className="inline-block" stroke="black" size="lg" />
            </Button>
            <Button
              variant="default"
              className="rounded-full"
              size="icon-lg"
              onClick={() => {
                api?.scrollNext()
              }}
            >
              <ChevronRight className="inline-block" stroke="black" size="lg" />
            </Button>
          </div>
        </div>

        {/* Empty state */}
        {isEmpty ? (
          <EmptyState title={title} />
        ) : (
          /* Carousel */
          <Carousel
            setApi={setApi}
            opts={{
              align: "start",
              loop: filteredProducts.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="">
              {filteredProducts.map((product, i) => (
                <CarouselItem
                  key={product.id}
                  className="basis-[50%] pl-2 sm:basis-[50%] md:basis-[33%] lg:basis-[25%]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <Product {...product} />
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        )}
      </div>
    </MotionSection>
  )
}
