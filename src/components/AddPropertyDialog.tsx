import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { X, Upload, Image as ImageIcon, Video } from "lucide-react";

interface AddPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const AddPropertyDialog = ({ open, onOpenChange, onSuccess }: AddPropertyDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [formData, setFormData] = useState({
    title: "",
    address: "",
    rental_type: "apartment",
    price: "",
    num_rooms: "",
    num_beds: "",
    gender_preference: "any",
    furnished: false,
    has_internet: false,
    description: "",
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 10) {
      toast({
        title: "تحذير",
        description: "يمكنك رفع 10 صور كحد أقصى",
        variant: "destructive",
      });
      return;
    }
    
    setImageFiles(prev => [...prev, ...files]);
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الفيديو يجب أن يكون أقل من 50 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setVideoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview("");
  };

  const handleAISuggestions = async () => {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-property-assistant', {
        body: {
          propertyData: {
            address: formData.address,
            rental_type: formData.rental_type,
            price: formData.price,
            num_rooms: formData.num_rooms,
            num_beds: formData.num_beds,
            furnished: formData.furnished,
            has_internet: formData.has_internet
          }
        }
      });

      if (error) throw error;

      if (data?.suggestions) {
        setFormData(prev => ({
          ...prev,
          title: data.suggestions.title || prev.title,
          description: data.suggestions.description || prev.description
        }));

        toast({
          title: "تم!",
          description: "تم إضافة الاقتراحات بنجاح",
        });
      }
    } catch (error: any) {
      console.error('AI suggestion error:', error);
      toast({
        title: "تنبيه",
        description: "لم نتمكن من الحصول على اقتراحات الآن",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("يجب تسجيل الدخول أولاً");

      const imageUrls: string[] = [];
      
      // Upload images
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from('property-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);

        imageUrls.push(publicUrl);
      }

      // Upload video
      let videoUrl = null;
      if (videoFile) {
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('property-videos')
          .upload(fileName, videoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-videos')
          .getPublicUrl(fileName);

        videoUrl = publicUrl;
      }

      const { error } = await supabase.from("properties").insert({
        owner_id: user.id,
        title: formData.title,
        address: formData.address,
        rental_type: formData.rental_type,
        price: parseFloat(formData.price),
        num_rooms: formData.num_rooms ? parseInt(formData.num_rooms) : null,
        num_beds: formData.num_beds ? parseInt(formData.num_beds) : null,
        gender_preference: formData.gender_preference,
        furnished: formData.furnished,
        has_internet: formData.has_internet,
        description: formData.description,
        images: imageUrls,
        video_url: videoUrl,
      });

      if (error) throw error;

      toast({
        title: "تم الإضافة بنجاح!",
        description: "تم إضافة العقار بنجاح",
      });

      onSuccess();
      onOpenChange(false);
      setFormData({
        title: "",
        address: "",
        rental_type: "apartment",
        price: "",
        num_rooms: "",
        num_beds: "",
        gender_preference: "any",
        furnished: false,
        has_internet: false,
        description: "",
      });
      setImageFiles([]);
      setImagePreviews([]);
      setVideoFile(null);
      setVideoPreview("");
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">إضافة عقار جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">عنوان العقار</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAISuggestions}
                disabled={aiLoading || !formData.address}
                className="text-xs"
              >
                {aiLoading ? "جاري التحميل..." : "✨ اقتراحات ذكية"}
              </Button>
            </div>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثال: شقة مفروشة قرب جامعة القاهرة"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">العنوان الكامل</Label>
            <Input
              id="address"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="مثال: شارع الجامعة، الجيزة"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>نوع السكن</Label>
              <Select
                value={formData.rental_type}
                onValueChange={(value) => setFormData({ ...formData, rental_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">شقة كاملة</SelectItem>
                  <SelectItem value="room">غرفة</SelectItem>
                  <SelectItem value="bed">سرير</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">السعر الشهري (جنيه)</Label>
              <Input
                id="price"
                type="number"
                required
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="1500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="num_rooms">عدد الغرف (اختياري)</Label>
              <Input
                id="num_rooms"
                type="number"
                value={formData.num_rooms}
                onChange={(e) => setFormData({ ...formData, num_rooms: e.target.value })}
                placeholder="2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="num_beds">عدد الأسرة (اختياري)</Label>
              <Input
                id="num_beds"
                type="number"
                value={formData.num_beds}
                onChange={(e) => setFormData({ ...formData, num_beds: e.target.value })}
                placeholder="3"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>مناسب لـ</Label>
            <Select
              value={formData.gender_preference}
              onValueChange={(value) => setFormData({ ...formData, gender_preference: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">الكل</SelectItem>
                <SelectItem value="male">ذكور فقط</SelectItem>
                <SelectItem value="female">إناث فقط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id="furnished"
                checked={formData.furnished}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, furnished: checked as boolean })
                }
              />
              <Label htmlFor="furnished" className="cursor-pointer">
                مفروش
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="has_internet"
                checked={formData.has_internet}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, has_internet: checked as boolean })
                }
              />
              <Label htmlFor="has_internet" className="cursor-pointer">
                يوجد إنترنت
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">وصف إضافي (اختياري)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="أضف تفاصيل إضافية عن العقار..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="images">صور العقار (حتى 10 صور)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
              <Input
                id="images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <label
                htmlFor="images"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  اضغط لرفع الصور
                </span>
              </label>
            </div>
            
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="video">فيديو العقار (اختياري - حتى 50 ميجا)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
              <Input
                id="video"
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />
              <label
                htmlFor="video"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Video className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-sm text-muted-foreground">
                  اضغط لرفع فيديو
                </span>
              </label>
            </div>
            
            {videoPreview && (
              <div className="relative group mt-2">
                <video
                  src={videoPreview}
                  controls
                  className="w-full h-48 rounded-lg"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={removeVideo}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "جاري الإضافة..." : "إضافة العقار"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPropertyDialog;