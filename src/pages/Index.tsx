import { Button } from "@/components/ui/button";
import { Building2, GraduationCap, Search, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                اعثر على سكنك المثالي بسهولة
              </h1>
              <p className="text-lg md:text-xl opacity-95">
                منصة سكنك تربط الطلاب بأصحاب العقارات لإيجاد سكن آمن ومريح بالقرب من جامعتك
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="text-lg hover-scale"
                >
                  <Link to="/auth">
                    <GraduationCap className="ml-2 h-5 w-5" />
                    للطلاب
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="text-lg border-2 bg-white/10 text-white hover:bg-white/20 hover-scale"
                >
                  <Link to="/auth">
                    <Building2 className="ml-2 h-5 w-5" />
                    لأصحاب العقارات
                  </Link>
                </Button>
              </div>
            </div>
            <div className="relative animate-fade-in">
              <img
                src={heroImage}
                alt="Modern student housing"
                className="rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">لماذا سكنك؟</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              نوفر لك تجربة فريدة للبحث عن السكن المناسب بكل سهولة وأمان
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all hover-scale">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Search className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">بحث متقدم</h3>
              <p className="text-muted-foreground">
                ابحث عن السكن المناسب بالقرب من جامعتك مع فلاتر متقدمة تناسب احتياجاتك
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all hover-scale">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">آمن وموثوق</h3>
              <p className="text-muted-foreground">
                جميع العقارات موثقة ومراجعة لضمان راحتك وأمانك
              </p>
            </div>

            <div className="text-center space-y-4 p-6 rounded-xl bg-card shadow-card hover:shadow-card-hover transition-all hover-scale">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold">سريع وسهل</h3>
              <p className="text-muted-foreground">
                احجز سكنك في دقائق معدودة من خلال منصة سهلة الاستخدام
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            ابدأ رحلتك الآن
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-95 max-w-2xl mx-auto">
            انضم لآلاف الطلاب وأصحاب العقارات الذين يثقون في منصة سكنك
          </p>
          <Button asChild size="lg" variant="secondary" className="text-lg hover-scale">
            <Link to="/auth">ابدأ الآن مجاناً</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Index;
