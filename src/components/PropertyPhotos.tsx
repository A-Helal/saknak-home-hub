import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STORAGE_BUCKETS } from "@/lib/constants";

interface PropertyPhotosProps {
  propertyId: string;
  photos: string[];
  onPhotosUpdate?: (photos: string[]) => void;
  isOwner?: boolean;
}

export const PropertyPhotos = ({
  propertyId,
  photos,
  onPhotosUpdate,
  isOwner = false,
}: PropertyPhotosProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate total files
    if (photos.length + files.length > 10) {
      toast({
        title: "تحذير",
        description: "لا يمكن رفع أكثر من 10 صور",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload files with delay to prevent UI freeze
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "خطأ",
            description: `الصورة ${file.name} أكبر من 5 ميجابايت`,
            variant: "destructive",
          });
          continue;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          toast({
            title: "خطأ",
            description: `${file.name} ليس ملف صورة`,
            variant: "destructive",
          });
          continue;
        }

        const fileExt = file.name.split(".").pop();
        const fileName = `${propertyId}/${Date.now()}_${i}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(STORAGE_BUCKETS.PROPERTY_IMAGES)
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        // Small delay to prevent UI freeze
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const updatedPhotos = [...photos, ...uploadedUrls];
      
      // Update property images in database
      const { error: updateError } = await supabase
        .from("properties")
        .update({ images: updatedPhotos })
        .eq("id", propertyId);

      if (updateError) throw updateError;

      toast({
        title: "تم!",
        description: `تم رفع ${uploadedUrls.length} صورة بنجاح`,
      });

      if (onPhotosUpdate) {
        onPhotosUpdate(updatedPhotos);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل رفع الصور",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      const updatedPhotos = photos.filter((url) => url !== photoUrl);

      const { error } = await supabase
        .from("properties")
        .update({ images: updatedPhotos })
        .eq("id", propertyId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف الصورة بنجاح",
      });

      if (onPhotosUpdate) {
        onPhotosUpdate(updatedPhotos);
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل حذف الصورة",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          صور العقار
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload Button (Owner only) */}
        {isOwner && (
          <div>
            <input
              type="file"
              id="photo-upload"
              multiple
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              disabled={uploading || photos.length >= 10}
            />
            <label htmlFor="photo-upload">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={uploading || photos.length >= 10}
                asChild
              >
                <span className="cursor-pointer flex items-center justify-center gap-2">
                  <Upload className="w-4 h-4" />
                  {uploading ? `جاري الرفع... ${uploadProgress}%` : "رفع صور جديدة"}
                </span>
              </Button>
            </label>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {photos.length}/10 صور • الحد الأقصى 5MB لكل صورة
            </p>
          </div>
        )}

        {/* Photo Grid with Scrollable Container */}
        {photos.length > 0 ? (
          <div
            className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto p-2"
            style={{
              scrollbarWidth: "thin",
              scrollbarColor: "hsl(var(--muted-foreground)) transparent",
            }}
          >
            {photos.map((photoUrl, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden border group"
              >
                <img
                  src={photoUrl}
                  alt={`صورة ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {isOwner && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDeletePhoto(photoUrl)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا توجد صور للعرض</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
