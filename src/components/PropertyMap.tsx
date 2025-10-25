import { MapPin, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PropertyMapProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  propertyTitle?: string;
}

export const PropertyMap = ({ latitude, longitude, address, propertyTitle }: PropertyMapProps) => {
  if (!latitude || !longitude) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            الموقع على الخريطة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            لم يتم تحديد موقع العقار على الخريطة
          </p>
        </CardContent>
      </Card>
    );
  }

  const googleMapsEmbedUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;
  const googleMapsDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          الموقع على الخريطة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {address && (
          <p className="text-sm text-muted-foreground">{address}</p>
        )}
        
        {/* Google Maps Embed */}
        <div className="rounded-lg overflow-hidden border">
          <iframe
            width="100%"
            height="300"
            src={googleMapsEmbedUrl}
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Navigation Button */}
        <Button
          asChild
          variant="outline"
          className="w-full"
        >
          <a
            href={googleMapsDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            فتح في خرائط جوجل للتوجيه
          </a>
        </Button>

        {/* Coordinates Display */}
        <div className="text-xs text-muted-foreground text-center">
          الإحداثيات: {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      </CardContent>
    </Card>
  );
};
