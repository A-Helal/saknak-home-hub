import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Bed, Home, Wifi, Users, Eye } from "lucide-react";
import PropertyDetailsDialog from "./PropertyDetailsDialog";

interface PropertyCardProps {
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
  };
  onAction?: (propertyId: string) => void;
  actionLabel?: string;
  showActions?: boolean;
}

const PropertyCard = ({
  property,
  onAction,
  actionLabel = "طلب حجز",
  showActions = true,
}: PropertyCardProps) => {
  const [detailsOpen, setDetailsOpen] = useState(false);

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
    <>
      <Card className="overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300">
        <div 
          className="relative h-48 bg-muted cursor-pointer group"
          onClick={() => setDetailsOpen(true)}
        >
          {property.images && property.images.length > 0 ? (
            <>
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Eye className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Home className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          <div className="absolute top-3 right-3">
            <Badge className="bg-primary text-primary-foreground">
              {getRentalTypeLabel(property.rental_type)}
            </Badge>
          </div>
          {property.images && property.images.length > 1 && (
            <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-xs">
              {property.images.length} صور
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
        <h3 className="font-bold text-xl text-foreground line-clamp-1">
          {property.title}
        </h3>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span className="text-sm line-clamp-1">{property.address}</span>
        </div>

        <div className="flex flex-wrap gap-2">
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
        </div>

        {property.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {property.description}
          </p>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-primary">
            {property.price.toFixed(2)} جنيه
          </span>
          <span className="text-sm text-muted-foreground mr-1">/شهرياً</span>
        </div>
          {showActions && onAction && (
            <Button onClick={() => onAction(property.id)}>{actionLabel}</Button>
          )}
        </CardFooter>
      </Card>

      <PropertyDetailsDialog
        property={property}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
};

export default PropertyCard;