import { Phone, Mail, MapPin } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-card border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">سكنك</h3>
            <p className="text-sm text-muted-foreground">
              منصة رائدة لتوفير السكن الطلابي والشقق المفروشة بأسعار مناسبة
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">تواصل معنا</h3>
            <div className="space-y-3">
              <a
                href="tel:01128414829"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span dir="ltr">01128414829</span>
              </a>
              <a
                href="mailto:support@saknak.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-4 h-4" />
                support@saknak.com
              </a>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                القاهرة، مصر
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4">خدمة العملاء</h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                نحن هنا لمساعدتك على مدار الساعة
              </p>
              <a
                href="tel:01128414829"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
              >
                <Phone className="w-4 h-4" />
                اتصل بنا الآن
              </a>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© 2024 سكنك. جميع الحقوق محفوظة</p>
        </div>
      </div>
    </footer>
  );
};
