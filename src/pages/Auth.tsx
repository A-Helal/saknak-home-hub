import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Building2, GraduationCap, Upload, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<"owner" | "student">("student");

  // Student-specific state
  const [civilIdFile, setCivilIdFile] = useState<File | null>(null);
  const [civilIdPreview, setCivilIdPreview] = useState<string>("");

  // Owner-specific state
  const [ownershipFile, setOwnershipFile] = useState<File | null>(null);
  const [ownershipPreview, setOwnershipPreview] = useState<string>("");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    // Student fields
    university: "",
    city: "",
    area: "",
    college: "",
    level: "",
  });

  const handleCivilIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setCivilIdFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCivilIdPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOwnershipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "خطأ",
        description: "حجم الملف يجب أن يكون أقل من 5 ميجابايت",
        variant: "destructive",
      });
      return;
    }

    setOwnershipFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setOwnershipPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Validate student fields
        if (userType === "student") {
          if (!civilIdFile) {
            toast({
              title: "خطأ",
              description: "يرجى رفع البطاقة المدنية",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
          if (!formData.city || !formData.area || !formData.college || !formData.level || !formData.university) {
            toast({
              title: "خطأ",
              description: "يرجى إكمال جميع البيانات المطلوبة",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }

        // Validate owner fields
        if (userType === "owner") {
          if (!ownershipFile) {
            toast({
              title: "خطأ",
              description: "يرجى رفع وثيقة ملكية العقار",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: formData.fullName,
              user_type: userType,
              phone: formData.phone,
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Failed to create user");

        // Wait for the profile creation trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Build profile data object
        const profileData: any = {
          id: authData.user.id,
          full_name: formData.fullName,
          phone: formData.phone,
          user_type: userType,
        };

        // Handle student-specific data
        if (userType === "student" && civilIdFile) {
          // Upload civil ID
          const fileExt = civilIdFile.name.split('.').pop();
          const fileName = `${authData.user.id}/civil_id.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('civil_ids')
            .upload(fileName, civilIdFile, { upsert: true });

          if (uploadError) {
            console.error('Civil ID upload error:', uploadError);
            throw new Error(`فشل رفع البطاقة المدنية: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('civil_ids')
            .getPublicUrl(fileName);

          // Add student data to profile
          profileData.civil_id_url = publicUrl;
          profileData.city = formData.city;
          profileData.area = formData.area;
          profileData.college = formData.college;
          profileData.university = formData.university;
          profileData.level = formData.level;
          profileData.score = 0;
        }

        // Handle owner-specific data
        if (userType === "owner" && ownershipFile) {
          // Upload ownership document
          const fileExt = ownershipFile.name.split('.').pop();
          const fileName = `${authData.user.id}/ownership.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('ownership_docs')
            .upload(fileName, ownershipFile, { upsert: true });

          if (uploadError) {
            console.error('Ownership doc upload error:', uploadError);
            throw new Error(`فشل رفع وثيقة الملكية: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('ownership_docs')
            .getPublicUrl(fileName);

          // Add owner data to profile
          profileData.ownership_image_url = publicUrl;
        }

        // UPSERT profile data (creates if not exists, updates if exists)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(profileData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (profileError) {
          console.error('Profile upsert error:', profileError);
          throw new Error(`فشل حفظ البيانات: ${profileError.message}`);
        }

        toast({
          title: "تم إنشاء الحساب بنجاح!",
          description: "مرحباً بك في سكنك",
        });
        navigate("/dashboard");
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;

        toast({
          title: "تم تسجيل الدخول بنجاح!",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <Card className="max-w-2xl mx-auto shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {isSignUp ? "إنشاء حساب جديد" : "تسجيل الدخول"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "ابدأ رحلتك في إيجاد السكن المثالي"
                : "مرحباً بعودتك إلى سكنك"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSignUp && (
              <Tabs
                value={userType}
                onValueChange={(value) => setUserType(value as "owner" | "student")}
                className="mb-6"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="student" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    طالب
                  </TabsTrigger>
                  <TabsTrigger value="owner" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    مالك عقار
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isSignUp && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">الاسم الكامل *</Label>
                    <Input
                      id="fullName"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>

                  {userType === "student" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="civilId">البطاقة المدنية (صورة أو PDF) *</Label>
                        <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                          <Input
                            id="civilId"
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleCivilIdChange}
                            className="hidden"
                          />
                          <label
                            htmlFor="civilId"
                            className="flex flex-col items-center justify-center cursor-pointer"
                          >
                            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                            <span className="text-sm text-muted-foreground">
                              {civilIdFile ? civilIdFile.name : "اضغط لرفع البطاقة المدنية"}
                            </span>
                          </label>
                        </div>
                        {civilIdPreview && !civilIdFile?.type.includes('pdf') && (
                          <img src={civilIdPreview} alt="Civil ID Preview" className="w-full h-32 object-cover rounded-lg" />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">المدينة *</Label>
                          <Input
                            id="city"
                            type="text"
                            required
                            value={formData.city}
                            onChange={(e) =>
                              setFormData({ ...formData, city: e.target.value })
                            }
                            placeholder="مثال: القاهرة"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="area">المنطقة *</Label>
                          <Input
                            id="area"
                            type="text"
                            required
                            value={formData.area}
                            onChange={(e) =>
                              setFormData({ ...formData, area: e.target.value })
                            }
                            placeholder="مثال: المعادي"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="university">الجامعة *</Label>
                        <Input
                          id="university"
                          type="text"
                          required
                          value={formData.university}
                          onChange={(e) =>
                            setFormData({ ...formData, university: e.target.value })
                          }
                          placeholder="مثال: جامعة القاهرة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="college">الكلية *</Label>
                        <Input
                          id="college"
                          type="text"
                          required
                          value={formData.college}
                          onChange={(e) =>
                            setFormData({ ...formData, college: e.target.value })
                          }
                          placeholder="مثال: كلية الهندسة"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="level">المستوى الدراسي *</Label>
                        <Select
                          value={formData.level}
                          onValueChange={(value) =>
                            setFormData({ ...formData, level: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="اختر المستوى" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">المستوى الأول</SelectItem>
                            <SelectItem value="2">المستوى الثاني</SelectItem>
                            <SelectItem value="3">المستوى الثالث</SelectItem>
                            <SelectItem value="4">المستوى الرابع</SelectItem>
                            <SelectItem value="5">المستوى الخامس</SelectItem>
                            <SelectItem value="excellence">الامتياز</SelectItem>
                            <SelectItem value="graduate">خريج</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {userType === "owner" && (
                    <div className="space-y-2">
                      <Label htmlFor="ownership">وثيقة ملكية العقار (صورة أو PDF) *</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors">
                        <Input
                          id="ownership"
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleOwnershipChange}
                          className="hidden"
                        />
                        <label
                          htmlFor="ownership"
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                          <span className="text-sm text-muted-foreground">
                            {ownershipFile ? ownershipFile.name : "اضغط لرفع وثيقة الملكية"}
                          </span>
                        </label>
                      </div>
                      {ownershipPreview && !ownershipFile?.type.includes('pdf') && (
                        <img src={ownershipPreview} alt="Ownership Document" className="w-full h-32 object-cover rounded-lg" />
                      )}
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني *</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور *</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري التحميل...
                  </>
                ) : isSignUp ? (
                  "إنشاء حساب"
                ) : (
                  "تسجيل الدخول"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
                disabled={isLoading}
              >
                {isSignUp ? "لديك حساب؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ واحداً"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
