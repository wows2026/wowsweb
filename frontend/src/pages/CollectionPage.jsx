import { useLanguage } from "@/i18n";
import { ProductsGrid, useProducts } from "@/components/FeaturedProducts";
import MaskedTitle from "@/components/MaskedTitle";
import OriginStory from "@/components/OriginStory";

export default function CollectionPage() {
  const { t } = useLanguage();
  const { products, failed } = useProducts();

  return (
    <div data-testid="collection-page">
      <div className="px-5 pt-28 pb-20 sm:px-8 sm:pt-32">
        <div className="mb-12">
          <MaskedTitle
            testid="collection-title"
            className="font-display text-4xl leading-none font-extrabold tracking-tight uppercase sm:text-6xl"
          >
            {t.products.collectionTitle}
          </MaskedTitle>
        </div>
        <ProductsGrid products={products} failed={failed} />
      </div>
      <OriginStory />
    </div>
  );
}
