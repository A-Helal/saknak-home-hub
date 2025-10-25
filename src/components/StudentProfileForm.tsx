import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText } from "lucide-react";

interface StudentProfile {
  id: string;
  full_name: string;
  phone: string;
  university: string;
  civil_id_url: string | null;
  city: string | null;
  area: string | null;
  college: string | null;
  level: string | null;
  score: number;
}

export const StudentProfileForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [civilIdFile, setCivilIdFile] = useState<File | null>(null);

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
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    }
  };

  const handleCivilIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "خطأ",
        description: "نوع الملف غير مدعوم. يرجى رفع صورة أو PDF",
        variant: "destructive",
      });
      return;
    }

    setCivilIdFile(file);
  };

  const uploadCivilId = async (userId: string): Promise<string | null> => {
    if (!civilIdFile) return null;

    setUploading(true);
    try {
      const fileExt = civilIdFile.name.split(".").pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("civil_ids")
        .upload(fileName, civilIdFile, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("civil_ids")
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("لم يتم تسجيل الدخول");

      const formData = new FormData(e.currentTarget);
      
      // Upload civil ID if new file selected
      let civilIdUrl = profile?.civil_id_url;
      if (civilIdFile) {
        const uploadedUrl = await uploadCivilId(user.id);
        if (uploadedUrl) civilIdUrl = uploadedUrl;
      }

      const updates = {
        full_name: formData.get("full_name") as string,
        phone: formData.get("phone") as string,
        university: formData.get("university") as string,
        civil_id_url: civilIdUrl,
        city: formData.get("city") as string,
        area: formData.get("area") as string,
        college: formData.get("college") as string,
        level: formData.get("level") as string,
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
        <CardTitle>الملف الشخصي للطالب</CardTitle>
        <CardDescription>
          أكمل معلوماتك الشخصية لتتمكن من حجز الوحدات السكنية
        </CardDescription>
        {profile.score > 0 && (
          <div className="mt-2 p-3 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium">
              نقاطك: <span className="text-primary text-lg">{profile.score}</span>
            </p>
          </div>
        )}
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

            <div className="space-y-2">
              <Label htmlFor="university">الجامعة *</Label>
              <Input
                id="university"
                name="university"
                defaultValue={profile.university || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="college">الكلية *</Label>
              <Input
                id="college"
                name="college"
                defaultValue={profile.college || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">المدينة *</Label>
              <Input
                id="city"
                name="city"
                defaultValue={profile.city || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="area">المنطقة *</Label>
              <Input
                id="area"
                name="area"
                defaultValue={profile.area || ""}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level">المستوى الدراسي *</Label>
              <Select name="level" defaultValue={profile.level || ""} required>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">المستوى الأول</SelectItem>
                  <SelectItem value="2">المستوى الثاني</SelectItem>
                  <SelectItem value="3">المستوى الثالث</SelectItem>
                  <SelectItem value="4">المستوى الرابع</SelectItem>
                  <SelectItem value="5">المستوى الخامس</SelectItem>
                  <SelectItem value="excellence">التميز</SelectItem>
                  <SelectItem value="graduate">خريج</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="civil_id">البطاقة المدنية *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="civil_id"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleCivilIdUpload}
                  className="hidden"
                />
                <label
                  htmlFor="civil_id"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-secondary"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    {civilIdFile
                      ? civilIdFile.name
                      : profile.civil_id_url
                      ? "تغيير الملف"
                      : "رفع البطاقة المدنية"}
                  </span>
                </label>
                {profile.civil_id_url && (
                  <a
                    href={profile.civil_id_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 border rounded-md hover:bg-secondary"
                  >
                    <FileText className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading || uploading} className="w-full">
            {loading || uploading ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
