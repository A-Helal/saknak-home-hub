import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Building2, GraduationCap } from "lucide-react";
import Navbar from "@/components/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<"owner" | "student">("student");

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    phone: "",
    university: "",
  });

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: formData.fullName,
              user_type: userType,
              phone: formData.phone,
              university: userType === "student" ? formData.university : null,
            },
          },
        });

        if (error) throw error;

        toast({
          title: "تم إنشاء الحساب بنجاح!",
          description: "مرحباً بك في سكنك",
        });
        navigate("/dashboard");
      } else {
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
                    <Label htmlFor="fullName">الاسم الكامل</Label>
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
                    <Label htmlFor="phone">رقم الهاتف</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  {userType === "student" && (
                    <div className="space-y-2">
                      <Label htmlFor="university">الجامعة</Label>
                      <Input
                        id="university"
                        type="text"
                        value={formData.university}
                        onChange={(e) =>
                          setFormData({ ...formData, university: e.target.value })
                        }
                      />
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
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
                <Label htmlFor="password">كلمة المرور</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? "جاري التحميل..."
                  : isSignUp
                  ? "إنشاء حساب"
                  : "تسجيل الدخول"}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setIsSignUp(!isSignUp)}
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