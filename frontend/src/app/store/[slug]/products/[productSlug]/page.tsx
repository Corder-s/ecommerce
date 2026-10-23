"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  Truck,
  Leaf,
  Sparkles,
  Flame,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  Info,
  Package,
} from "lucide-react";
import {
  getPublicStore,
  getPublicStoreCategories,
  getPublicStoreProducts,
  getPublicProduct,
  addToCart,
  PublicStore,
  PublicStoreCategory,
  PublicProduct,
} from "@/lib/storefrontApi";
import { StorefrontHeader } from "@/components/storefront/StorefrontHeader";
import { StorefrontFooter } from "@/components/storefront/StorefrontFooter";
import { StoreProductCard } from "@/components/storefront/StoreProductCard";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";

interface ProductDetailsContentProps {
  slug: string;
  productSlug: string;
}

function ProductDetailsContent({ slug, productSlug }: ProductDetailsContentProps) {
  const { wishlist, toggleWishlist, addItem } = useCart();
  const { toast } = useToast();

  const [store, setStore] = useState<PublicStore | null>(null);
  const [categories, setCategories] = useState<PublicStoreCategory[]>([]);
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<PublicProduct[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      setError(null);
      try {
        const [storeData, catData, productDetails] = await Promise.all([
          getPublicStore(slug),
          getPublicStoreCategories(slug),
          getPublicProduct(slug, productSlug),
        ]);

        if (!isMounted) return;
        setStore(storeData);
        setCategories(catData.data || []);
        setProduct(productDetails.product);

        // Fetch related products from the same category or store
        try {
          const prodsRes = await getPublicStoreProducts(slug, {
            categoryId: productDetails.product.category?.id,
            limit: 4,
          });
          if (isMounted) {
            // Exclude current product
            setRelatedProducts(prodsRes.data.filter((p) => p.id !== productDetails.product.id));
          }
        } catch {
          // Ignore related failure
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Product not found or unavailable.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [slug, productSlug]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
        <div style={{ height: "100px", borderBottom: "1px solid var(--color-border)", backgroundColor: "#FFFFFF" }} />
        <div className="container" style={{ padding: "3rem 1.5rem" }}>
          <Skeleton width="30%" height="24px" style={{ marginBottom: "2rem" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3rem" }}>
            <Skeleton height="450px" style={{ borderRadius: "var(--radius-lg)" }} />
            <div>
              <Skeleton width="70%" height="36px" style={{ marginBottom: "1rem" }} />
              <Skeleton width="40%" height="28px" style={{ marginBottom: "1.5rem" }} />
              <Skeleton height="100px" style={{ marginBottom: "2rem" }} />
              <Skeleton height="50px" style={{ marginBottom: "1rem" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product || !store) {
    return (
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "var(--color-background)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            maxWidth: "520px",
            width: "100%",
            backgroundColor: "#FFFFFF",
            borderRadius: "var(--radius-xl)",
            padding: "3rem 2rem",
            textAlign: "center",
            boxShadow: "0 12px 36px rgba(32, 35, 60, 0.08)",
            border: "1px solid var(--color-border)",
          }}
        >
          <AlertTriangle size={36} color="#DC2626" style={{ margin: "0 auto 1.25rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
            Product Unavailable
          </h2>
          <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "2rem" }}>
            {error || "The requested product does not exist or has been unpublished by the seller."}
          </p>
          <Link href={`/store/${slug}/products`}>
            <Button variant="primary" size="md">
              Browse Store Catalogue
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const maxStock = product.stock !== undefined ? Math.min(product.stock, 10) : 10;

  // Image list
  const fallbackImages = [
    product.category?.slug?.includes("diya")
      ? "/images/product_diyas.jpg"
      : product.category?.slug?.includes("dhoop")
      ? "/images/product_dhoop.jpg"
      : product.category?.slug?.includes("statue")
      ? "/images/product_statue.jpg"
      : product.category?.slug?.includes("kit")
      ? "/images/product_puja_kit.jpg"
      : "/images/hero_artisans.jpg",
  ];
  const images = product.images && product.images.length > 0 ? product.images : fallbackImages;
  const currentImage = images[activeImageIndex] || images[0];

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    toast({
      type: isWishlisted ? "info" : "success",
      title: isWishlisted ? "Removed from Wishlist" : "Saved to Wishlist",
      message: product.name,
    });
  };

  const handleAddToCart = async () => {
    if (isOutOfStock || isAdding) return;
    setIsAdding(true);
    try {
      await addToCart(product.id, quantity, slug);

      const clientProduct: any = {
        id: product.id,
        name: product.name,
        slug: product.slug,
        tagline: product.name,
        price: product.price,
        description: product.description || "",
        category: (product.category?.slug as any) || "diyas",
        images: images,
        inStock: !isOutOfStock,
        stockCount: product.stock ?? 10,
        rating: 4.9,
        reviewCount: 38,
        artisan: {
          name: "Vedic Artisan",
          location: "Vrindavan, UP",
          gaushala: store.businessName,
        },
        sacredIngredients: ["Desi Cow Dung", "Natural Herbs"],
        weight: "250g",
      };
      addItem(clientProduct, quantity);

      toast({
        type: "success",
        title: "Added to Sacred Basket",
        message: `${quantity} × ${product.name} added.`,
      });

      setIsCartOpen(true);
    } catch {
      toast({
        type: "error",
        title: "Failed to Add to Basket",
        message: "Please try again.",
      });
    } finally {
      setIsAdding(false);
    }
  };

  // Determine whether item is an incense / diya requiring fire safety instructions
  const isCombustible =
    product.category?.slug?.includes("diya") ||
    product.category?.slug?.includes("dhoop") ||
    product.category?.slug?.includes("havan");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", display: "flex", flexDirection: "column" }}>
      <StorefrontHeader
        store={store}
        categories={categories}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        storeSlug={store.storeSlug}
      />

      {/* Breadcrumbs */}
      <div
        style={{
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid var(--color-border)",
          padding: "1rem 0",
        }}
      >
        <div className="container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.82rem",
              color: "var(--color-text-secondary)",
              flexWrap: "wrap",
            }}
          >
            <Link
              href={`/store/${slug}`}
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              {store.businessName}
            </Link>
            <span>/</span>
            <Link
              href={`/store/${slug}/products`}
              style={{ color: "inherit", textDecoration: "none" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
            >
              Products
            </Link>
            {product.category && (
              <>
                <span>/</span>
                <Link
                  href={`/store/${slug}/categories/${product.category.slug}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-primary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-secondary)")}
                >
                  {product.category.name}
                </Link>
              </>
            )}
            <span>/</span>
            <span style={{ color: "var(--color-text-main)", fontWeight: 600 }}>{product.name}</span>
          </div>
        </div>
      </div>

      {/* Product Details Main Section */}
      <div className="container" style={{ padding: "3rem 1.5rem 5rem", flex: 1 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "3.5rem",
            alignItems: "flex-start",
            marginBottom: "4.5rem",
          }}
        >
          {/* Left Column: Image Gallery */}
          <div>
            {/* Primary Image */}
            <div
              style={{
                position: "relative",
                width: "100%",
                paddingTop: "90%",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                backgroundColor: "#FFFFFF",
                border: "1px solid var(--color-border)",
                boxShadow: "0 8px 30px rgba(91, 92, 226, 0.08)",
                marginBottom: "1rem",
              }}
            >
              <Image
                src={currentImage}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "cover" }}
              />

              {/* Wishlist floating toggle */}
              <button
                type="button"
                onClick={handleWishlistToggle}
                style={{
                  position: "absolute",
                  top: "1rem",
                  right: "1rem",
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  backgroundColor: "rgba(255, 255, 255, 0.94)",
                  border: "1px solid rgba(228, 230, 244, 0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: isWishlisted ? "var(--color-accent-orange)" : "var(--color-text-secondary)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  transition: "transform 0.2s ease",
                  transform: isWishlisted ? "scale(1.1)" : "scale(1)",
                }}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart size={20} fill={isWishlisted ? "var(--color-accent-orange)" : "none"} />
              </button>
            </div>

            {/* Thumbnails if multiple images */}
            {images.length > 1 && (
              <div style={{ display: "flex", gap: "0.75rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      position: "relative",
                      width: "74px",
                      height: "74px",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      border: activeImageIndex === idx ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                      padding: 0,
                      cursor: "pointer",
                      backgroundColor: "#FFFFFF",
                      flexShrink: 0,
                      opacity: activeImageIndex === idx ? 1 : 0.7,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Image src={img} alt={`${product.name} thumbnail ${idx + 1}`} fill sizes="74px" style={{ objectFit: "cover" }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Purchase Actions */}
          <div>
            {/* Category Pill */}
            {product.category && (
              <span
                style={{
                  display: "inline-block",
                  backgroundColor: "var(--color-primary-subtle)",
                  color: "var(--color-primary)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "0.25rem 0.75rem",
                  borderRadius: "var(--radius-pill)",
                  marginBottom: "0.75rem",
                }}
              >
                {product.category.name}
              </span>
            )}

            <h1
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.25rem)",
                fontWeight: 800,
                color: "var(--color-text-main)",
                lineHeight: 1.25,
                letterSpacing: "-0.02em",
                marginBottom: "0.75rem",
              }}
            >
              {product.name}
            </h1>

            {/* SKU and Stock Badges */}
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
              {product.sku && (
                <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  SKU: <strong style={{ color: "var(--color-text-main)" }}>{product.sku}</strong>
                </span>
              )}

              {isOutOfStock ? (
                <span
                  style={{
                    backgroundColor: "rgba(220, 38, 38, 0.1)",
                    color: "#DC2626",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.65rem",
                    borderRadius: "var(--radius-pill)",
                  }}
                >
                  Out of Stock
                </span>
              ) : (
                <span
                  style={{
                    backgroundColor: "rgba(24, 132, 90, 0.1)",
                    color: "var(--color-success)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    padding: "0.2rem 0.65rem",
                    borderRadius: "var(--radius-pill)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>{product.stock !== undefined ? `${product.stock} Available in Gaushala` : "In Stock"}</span>
                </span>
              )}
            </div>

            {/* Price Presentation */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem 1.5rem",
                border: "1px solid var(--color-border)",
                marginBottom: "1.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "2.2rem",
                    fontWeight: 800,
                    color: "var(--color-text-main)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  ₹{product.price.toLocaleString("en-IN")}
                </span>
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                  INR (Taxes Included)
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                Free standard shipping on sacred Vedic artisan crafts across India.
              </p>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              {/* Quantity increment/decrement */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1.5px solid var(--color-border)",
                  borderRadius: "var(--radius-pill)",
                  backgroundColor: "#FFFFFF",
                  padding: "0.2rem 0.4rem",
                }}
              >
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: "none",
                    background: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: quantity <= 1 || isOutOfStock ? "not-allowed" : "pointer",
                    color: "var(--color-text-main)",
                  }}
                >
                  <Minus size={15} />
                </button>

                <span
                  style={{
                    minWidth: "36px",
                    textAlign: "center",
                    fontSize: "0.95rem",
                    fontWeight: 700,
                    color: "var(--color-text-main)",
                  }}
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  disabled={quantity >= maxStock || isOutOfStock}
                  onClick={() => setQuantity((prev) => Math.min(maxStock, prev + 1))}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    border: "none",
                    background: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: quantity >= maxStock || isOutOfStock ? "not-allowed" : "pointer",
                    color: "var(--color-text-main)",
                  }}
                >
                  <Plus size={15} />
                </button>
              </div>

              {/* Add to Cart CTA */}
              <Button
                variant="primary"
                size="lg"
                disabled={isOutOfStock || isAdding}
                onClick={handleAddToCart}
                leftIcon={<ShoppingBag size={18} />}
                style={{ flex: 1, minWidth: "180px" }}
              >
                {isOutOfStock ? "Currently Sold Out" : isAdding ? "Adding to Basket..." : "Add to Sacred Basket"}
              </Button>
            </div>

            {/* Product Description */}
            {product.description && (
              <div style={{ marginBottom: "2rem" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.5rem" }}>
                  Description & Vedic Craftsmanship
                </h3>
                <p style={{ fontSize: "0.92rem", color: "var(--color-text-secondary)", lineHeight: 1.65 }}>
                  {product.description}
                </p>
              </div>
            )}

            {/* Usage & Fire Safety Information (for Combustibles like Diyas & Dhoop) */}
            {isCombustible && (
              <div
                style={{
                  backgroundColor: "rgba(255, 156, 67, 0.08)",
                  borderRadius: "var(--radius-lg)",
                  padding: "1.25rem 1.5rem",
                  border: "1px solid rgba(255, 156, 67, 0.25)",
                  marginBottom: "2rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-accent-orange)", fontWeight: 700, marginBottom: "0.5rem" }}>
                  <Flame size={18} />
                  <span>Ritual Usage & Fire Safety Guidelines</span>
                </div>
                <ul style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.6, paddingLeft: "1.25rem", margin: 0 }}>
                  <li>Always place burning diyas, dhoop cups, or samagri on a heat-resistant, fireproof plate or brass burner.</li>
                  <li>Ensure the burning area is well-ventilated and kept away from curtains, loose papers, or flammable objects.</li>
                  <li>Never leave ignited oil lamps or herbal incense unattended or within reach of small children and pets.</li>
                  <li>Allow the residue ashes to cool completely before disposal or using as sacred plant compost.</li>
                </ul>
              </div>
            )}

            {/* Sacred Composition & Storage */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: "var(--radius-lg)",
                padding: "1.25rem 1.5rem",
                border: "1px solid var(--color-border)",
              }}
            >
              <h4 style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--color-text-main)", marginBottom: "0.6rem" }}>
                Materials & Storage Details
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", fontSize: "0.82rem" }}>
                <div>
                  <span style={{ color: "var(--color-text-secondary)", display: "block" }}>Craft Material</span>
                  <strong style={{ color: "var(--color-text-main)" }}>Desi Cow Dung & Natural Herbs</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)", display: "block" }}>Eco-Footprint</span>
                  <strong style={{ color: "var(--color-success)" }}>100% Biodegradable</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)", display: "block" }}>Storage</span>
                  <strong style={{ color: "var(--color-text-main)" }}>Store in cool, dry place</strong>
                </div>
                <div>
                  <span style={{ color: "var(--color-text-secondary)", display: "block" }}>Gaushala Origin</span>
                  <strong style={{ color: "var(--color-text-main)" }}>{store.businessName}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "3.5rem" }}>
            <div style={{ marginBottom: "2rem" }}>
              <span
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--color-primary)",
                  display: "block",
                  marginBottom: "0.4rem",
                }}
              >
                More from {store.businessName}
              </span>
              <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-main)", letterSpacing: "-0.02em" }}>
                Related Sacred Crafts
              </h2>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "1.75rem",
              }}
            >
              {relatedProducts.map((relProduct) => (
                <StoreProductCard
                  key={relProduct.id}
                  product={relProduct}
                  storeSlug={slug}
                  onAddToCartSuccess={() => setIsCartOpen(true)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <StorefrontFooter store={store} categories={categories} />
    </div>
  );
}

export default function ProductDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div style={{ padding: "4rem", textAlign: "center", color: "var(--color-text-secondary)" }}>
          Loading sacred product details...
        </div>
      }
    >
      <ProductDetailsWrapper params={params} />
    </Suspense>
  );
}

function ProductDetailsWrapper({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const unwrappedParams = use(params);
  return (
    <ProductDetailsContent
      slug={unwrappedParams.slug}
      productSlug={unwrappedParams.productSlug}
    />
  );
}
