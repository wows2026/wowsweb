import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import FeaturedProducts from "@/components/FeaturedProducts";
import OriginStory from "@/components/OriginStory";
import Lookbook from "@/components/Lookbook";
import Social from "@/components/Social";
import Newsletter from "@/components/Newsletter";

export default function Landing() {
  return (
    <main>
      <Hero />
      <Marquee />
      <FeaturedProducts />
      <OriginStory />
      <Lookbook />
      <Social />
      <Newsletter />
    </main>
  );
}
