import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { Hero } from "../components/sections/Hero";
import { Features } from "../components/sections/Features";
import { PlatformSection } from "../components/sections/PlatformSection";
import { IntegrationsSection } from "../components/sections/IntegrationsSection";
import { ReviewsScroller } from "../components/sections/ReviewsScroller";
import { GetStarted } from "../components/sections/GetStarted";

export function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <PlatformSection />
        <IntegrationsSection />
        <ReviewsScroller />
        <GetStarted />
      </main>
      <Footer />
    </div>
  );
}
