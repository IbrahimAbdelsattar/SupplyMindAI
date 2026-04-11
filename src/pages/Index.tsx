import { LandingNavbar } from '@/components/landing/LandingNavbar';
import { HeroSection } from '@/components/landing/HeroSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { MetricsSection } from '@/components/landing/MetricsSection';
import { UseCasesSection } from '@/components/landing/UseCasesSection';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <LandingNavbar />
      <main>
        <HeroSection />
        <section id="features">
          <FeaturesSection />
        </section>
        <MetricsSection />
        <section id="use-cases">
          <UseCasesSection />
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
