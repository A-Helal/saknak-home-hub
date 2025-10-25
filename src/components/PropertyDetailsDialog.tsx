import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Home, Wifi, Users } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { PropertyMap } from "@/components/PropertyMap";
import { ReservationButton } from "@/components/ReservationButton";

interface PropertyDetailsDialogProps {
  property: {
    id: string;
    title: string;
    address: string;
    rental_type: string;
    price: number;
    owner_id: string;
    num_rooms?: number;
    num_beds?: number;
    gender_preference?: string;
    furnished?: boolean;
    has_internet?: boolean;
    images?: string[];
    video_url?: string;
    description?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PropertyDetailsDialog = ({ property, open, onOpenChange }: PropertyDetailsDialogProps) => {
  if (!property) return null;

  const getRentalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      apartment: "شقة كاملة",
      room: "غرفة",
      bed: "سرير",
    };
    return labels[type] || type;
  };

  const getGenderLabel = (gender?: string) => {
    const labels: Record<string, string> = {
      male: "ذكور",
      female: "إناث",
      any: "مختلط",
    };
    return gender ? labels[gender] || gender : "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{property.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {property.images && property.images.length > 0 ? (
            <div className="relative">
              <Carousel className="w-full max-w-4xl mx-auto" opts={{ loop: true, align: "center" }}>
                <CarouselContent>
                  {property.images.map((image, index) => (
                    <CarouselItem key={`img-${index}-${image.substring(image.length - 20)}`}>
                      <div className="relative w-full overflow-hidden rounded-lg bg-muted" style={{ height: "500px" }}>
                        <img
                          src={image}
                          alt={`${property.title} - صورة ${index + 1}`}
                          className="w-full h-full object-contain bg-black"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/placeholder.svg';
                          }}
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/90 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg">
                          {index + 1} / {property.images.length}
                        </div>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {property.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-4" />
                    <CarouselNext className="right-4" />
                  </>
                )}
              </Carousel>
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-sm shadow-lg z-20">
                📸 {property.images.length} {property.images.length === 1 ? 'صورة' : 'صور'}
              </div>
              {property.images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm shadow-lg z-20 flex items-center gap-2">
                  <span>← استخدم الأسهم لعرض جميع الصور →</span>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-[500px] bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p>لا توجد صور لهذا العقار</p>
              </div>
            </div>
          )}

          {property.video_url && (
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">فيديو العقار</h3>
              <video
                src={property.video_url}
                controls
                className="w-full rounded-lg"
                style={{ maxHeight: "400px" }}
              />
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-5 w-5" />
              <span>{property.address}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-primary text-primary-foreground">
                {getRentalTypeLabel(property.rental_type)}
              </Badge>
              {property.num_rooms && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Home className="h-3 w-3" />
                  {property.num_rooms} غرف
                </Badge>
              )}
              {property.num_beds && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Bed className="h-3 w-3" />
                  {property.num_beds} أسرة
                </Badge>
              )}
              {property.has_internet && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  إنترنت
                </Badge>
              )}
              {property.gender_preference && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {getGenderLabel(property.gender_preference)}
                </Badge>
              )}
              {property.furnished && (
                <Badge variant="secondary">مفروش</Badge>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="text-3xl font-bold text-primary">
                {property.price.toFixed(2)} جنيه
                <span className="text-lg text-muted-foreground mr-2">/شهرياً</span>
              </div>
            </div>

            {property.description && (
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-2">الوصف</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {property.description}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">معلومات الدفع</h3>
              <div className="space-y-3 text-sm bg-secondary/30 p-4 rounded-lg">
                <p className="font-medium">طرق الدفع المتاحة:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span>دفع عربون (20% من قيمة الإيجار)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                    <span>دفع كامل المبلغ</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  ℹ️ ستتمكن من اختيار طريقة الدفع بعد تأكيد الحجز من قبل المالك
                </p>
              </div>
            </div>

            {(property.latitude && property.longitude) && (
              <div className="border-t pt-4">
                <PropertyMap
                  latitude={property.latitude}
                  longitude={property.longitude}
                  address={property.address}
                  propertyTitle={property.title}
                />
              </div>
            )}

            <div className="border-t pt-4">
              <ReservationButton
                propertyId={property.id}
                propertyTitle={property.title}
                ownerId={property.owner_id}
                onSuccess={() => onOpenChange(false)}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailsDialog;
