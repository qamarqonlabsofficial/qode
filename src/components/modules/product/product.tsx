"use client"

import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import ProductCarousel from "./productCarousel"
import Link from "next/link"
import { motion } from "motion/react"
import { useCartStore } from "@/store/CartStore"
import { type Product } from "@/types/product"
import { ShoppingCart, Zap } from "lucide-react"
import { useState, useCallback } from "react"

const MotionCard = motion.create(Card)
const MotionButton = motion.create(Button)

/** Safely calculate discount percentage */
function getDiscountPct(realPrice: string, salePrice: string): number {
  const real = parseFloat(realPrice)
  const sale = parseFloat(salePrice)
  if (!real || !sale || real <= sale) return 0
  return Math.round(((real - sale) / real) * 100)
}

function Product({
  name,
  description,
  id,
  realPrice,
  salePrice,
  images,
}: Product) {
  const addToCart = useCartStore((state) => state.addToCart)
  const [added, setAdded] = useState(false)

  const handleAddToCart = useCallback(() => {
    if (added) return
    addToCart(id, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }, [added, addToCart, id])

  const discountPct = salePrice ? getDiscountPct(realPrice, salePrice) : 0
  const hasDiscount = discountPct > 0

  return (
    <MotionCard
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: "-40px" }}
      style={{
        boxShadow:
          "inset 2px 2px 3px hsla(0,0%,100%,0.12), 0 4px 16px hsla(0,0%,0%,0.4)",
      }}
      className="relative flex max-w-sm flex-col gap-0 overflow-hidden rounded-2xl border border-white/10 bg-card p-0 text-white shadow-sm"
    >
      {/* Sale badge */}
      {hasDiscount && (
        <div
          aria-label={`${discountPct}% off`}
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-0.5 rounded-full bg-primary px-2 py-1 text-[11px] leading-none font-black text-black shadow"
        >
          <Zap className="h-3 w-3 fill-black" />
          {discountPct}% OFF
        </div>
      )}

      {/* Image carousel */}
      <ProductCarousel img={images} name={name} />
      <Link href={`/shop/${id}`} tabIndex={-1} aria-hidden>
        <div className="flex flex-1 flex-col px-3 pt-4 pb-0">
          {/* Name */}
          <h3 className="line-clamp-2 text-sm leading-snug font-bold text-white group-hover/name:underline sm:text-base">
            {name}
          </h3>
          {/* Description — stripped of HTML tags for safety */}
          <p
            className="line-clamp-2 text-xs leading-relaxed text-white/50"
            dangerouslySetInnerHTML={{
              // Strip tags for display — sanitize properly server-side
              __html: description,
            }}
          />

          {/* Price */}
          <CardFooter className="mt-auto flex w-full flex-col items-start gap-3 p-0 pt-3">
            <div className="flex items-baseline gap-2">
              {hasDiscount ? (
                <>
                  <span className="text-lg font-bold text-white">
                    {salePrice} PKR
                  </span>
                  <span className="text-sm text-white/40 line-through">
                    {realPrice} PKR
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-white">
                  {realPrice} PKR
                </span>
              )}
            </div>

            {/* Add to cart */}
          </CardFooter>
        </div>
      </Link>

      {/* Info */}

      <MotionButton
        animate={added ? { scale: [1, 0.96, 1] } : { scale: 1 }}
        transition={{ duration: 0.2 }}
        aria-label={`Add ${name} to cart`}
        disabled={added}
        onClick={handleAddToCart}
        className="mx-0 mt-4 flex w-full items-center justify-center gap-2 rounded-t-none rounded-b-2xl py-5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-80"
      >
        <ShoppingCart className="h-4 w-4" />
        {added ? "Added!" : "Add to Cart"}
      </MotionButton>
    </MotionCard>
  )
}

export default Product
