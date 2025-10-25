import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, MapPin } from "lucide-react";

interface OwnerProfile {
  id: string;
  full_name: string;
  phone: string;
  ownership_image_url: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const OwnerProfileForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<OwnerProfile | null>(null);
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      if (data.address) setAddress(data.address);
      if (data.latitude && data.longitude) {
        setCoordinates({ lat: data.latitude, lng: data.longitude });
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    }
  };

  const handleOwnershipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "خطأ",
        description: "نوع الملف غير مدعوم. يرجى رفع صورة",
        variant: "destructive",
      });
      return;
    }

    setOwnershipFile(file);
  };

  const uploadOwnershipImage = async (userId: string): Promise<string | null> => {
    if (!ownershipFile) return null;

    setUploading(true);
    try {
      const fileExt = ownershipFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("ownership_images")
        .upload(fileName, ownershipFile, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("ownership_images")
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل رفع الملف",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const geocodeAddress = async () => {
    if (!address.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال العنوان أولاً",
        variant: "destructive",
      });
      return;
    }

    setGeocoding(true);
    try {
      // Using Nominatim (OpenStreetMap) API for geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        setCoordinates({ lat: parseFloat(lat), lng: parseFloat(lon) });
        toast({
          title: "تم!",
          description: "تم تحديد الموقع على الخريطة",
        });
      } else {
        toast({
          title: "تنبيه",
          description: "لم يتم العثور على الموقع. يرجى التحقق من العنوان",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديد الموقع",
        variant: "destructive",
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لم يتم تسجيل الدخول");

      const formData = new FormData(e.currentTarget);
      
      // Upload ownership image if new file selected
      let ownershipUrl = profile?.ownership_image_url;
      if (ownershipFile) {
        const uploadedUrl = await uploadOwnershipImage(user.id);
        if (uploadedUrl) ownershipUrl = uploadedUrl;
      }

      const updates = {
        full_name: formData.get("full_name") as string,
        phone: formData.get("phone") as string,
        ownership_image_url: ownershipUrl,
        address: address,
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "تم الحفظ!",
        description: "تم تحديث معلومات الملف الشخصي بنجاح",
      });

      fetchProfile();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!profile) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>الملف الشخصي للمالك</CardTitle>
        <CardDescription>
          أكمل معلوماتك الشخصية ومعلومات الملكية
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                name="full_name"
                defaultValue={profile.full_name}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={profile.phone || ""}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="ownership_image">صورة وثيقة الملكية *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="ownership_image"
                  type="file"
                  accept="image/*"
                  onChange={handleOwnershipUpload}
                  className="hidden"
                />
                <label
                  htmlFor="ownership_image"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-secondary"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {ownershipFile
                      ? ownershipFile.name
                      : profile.ownership_image_url
                      ? "تغيير الصورة"
                      : "رفع صورة وثيقة الملكية"}
                  </span>
                </label>
                {profile.ownership_image_url && (
                  <a
                    href={profile.ownership_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border rounded-md hover:bg-secondary"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">العنوان الكامل *</Label>
              <div className="flex gap-2">
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="أدخل العنوان الكامل للعقار"
                  required
                  rows={3}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={geocodeAddress}
                  disabled={geocoding}
                  className="px-3"
                >
                  <MapPin className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                اضغط على أيقونة الخريطة لتحديد الموقع تلقائياً
              </p>
            </div>

            {coordinates && (
              <div className="md:col-span-2 space-y-2">
                <Label>موقع العقار على الخريطة</Label>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    width="100%"
                    height="300"
                    frameBorder="0"
                    src={`https://www.google.com/maps?q=${coordinates.lat},${coordinates.lng}&z=15&output=embed`}
                    title="Property Location"
                  ></iframe>
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>
                    الإحداثيات: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </span>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${coordinates.lat},${coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    فتح في خرائط جوجل
                  </a>
                </div>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading || uploading} className="w-full">
            {loading || uploading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
