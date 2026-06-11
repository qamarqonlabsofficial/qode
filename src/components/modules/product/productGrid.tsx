import Link from "next/link"
import * as motion from "motion/react-client"
import { Button } from "@/components/ui/button"
import Product from "./product"
import { type Product as ProductType } from "@/types/product"
import { PackageSearch } from "lucide-react"

interface ProductGridProps {
  title: string
  description?: string
  cta?: string
  link?: string
  products: ProductType[]
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-white/20 py-16 text-center text-white/50">
      <PackageSearch className="h-10 w-10 opacity-40" />
      <p className="text-sm font-medium">
        No products found in &quot;{title}&quot;
      </p>
      <p className="text-xs text-white/30">Try adjusting your filters</p>
    </div>
  )
}

export default function ProductGrid({
  title,
  description,
  cta = "Browse All",
  link = "/shop",
  products,
}: ProductGridProps) {
  const isEmpty = products.length === 0

  return (
    <div className="flex w-full items-center justify-center">
      <div className="w-full max-w-375">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-xl space-y-1.5">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                {title}
              </h2>
              {description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              )}
              {!isEmpty && (
                <p className="text-xs text-muted-foreground/60">
                  {products.length} {products.length === 1 ? "item" : "items"}
                </p>
              )}
            </div>

            <Link href={link}>
              <Button variant="default" className="rounded-full px-6">
                {cta}
              </Button>
            </Link>
          </div>

          {/* Grid or empty state */}
          {isEmpty ? (
            <EmptyState title={title} />
          ) : (
            <div className="-ml-2 grid grid-cols-2 items-start gap-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product, i) => (
                <div
                  key={product.id}
                  className="basis-[50%] sm:basis-[50%] md:basis-[33%] lg:basis-[25%]"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.4 }}
                    viewport={{ once: true }}
                  >
                    <Product {...product} />
                  </motion.div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
