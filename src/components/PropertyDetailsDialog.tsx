import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bed, Home, Wifi, Users } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

interface PropertyDetailsDialogProps {
  property: {
    id: string;
    title: string;
    address: string;
    rental_type: string;
    price: number;
    num_rooms?: number;
    num_beds?: number;
    gender_preference?: string;
    furnished?: boolean;
    has_internet?: boolean;
    images?: string[];
    video_url?: string;
    description?: string;
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
          {/* Images Carousel */}
          {property.images && property.images.length > 0 && (
            <div className="relative">
              <Carousel className="w-full">
                <CarouselContent>
                  {property.images.map((image, index) => (
                    <CarouselItem key={index}>
                      <div className="relative h-96">
                        <img
                          src={image}
                          alt={`${property.title} - صورة ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {property.images.length > 1 && (
                  <>
                    <CarouselPrevious className="right-4" />
                    <CarouselNext className="left-4" />
                  </>
                )}
              </Carousel>
            </div>
          )}

          {/* Video */}
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

          {/* Property Details */}
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailsDialog;
