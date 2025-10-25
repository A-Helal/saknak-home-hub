import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ReservationButtonProps {
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  onSuccess?: () => void;
  disabled?: boolean;
}

export const ReservationButton = ({
  propertyId,
  propertyTitle,
  ownerId,
  onSuccess,
  disabled = false,
}: ReservationButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsOwner(user.id === ownerId);
      }
    };
    checkOwnership();
  }, [ownerId]);

  const handleReservation = async () => {
    if (loading || isProcessing) {
      return;
    }

    setLoading(true);
    setIsProcessing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "خطأ",
          description: "يجب تسجيل الدخول أولاً",
          variant: "destructive",
        });
        setLoading(false);
        setIsProcessing(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("civil_id_url, city, area, college, level, user_type")
        .eq("id", user.id)
        .single();

      if (profile?.user_type === "student") {
        if (!profile.civil_id_url || !profile.city || !profile.area || !profile.college || !profile.level) {
          toast({
            title: "يجب إكمال الملف الشخصي",
            description: "يرجى إكمال بياناتك الشخصية قبل الحجز (البطاقة المدنية، المدينة، المنطقة، الكلية، المستوى)",
            variant: "destructive",
          });
          return;
        }
      }

      const { data: existingBooking } = await supabase
        .from("booking_requests")
        .select("id, status")
        .eq("student_id", user.id)
        .eq("property_id", propertyId)
        .eq("status", "pending")
        .maybeSingle();

      if (existingBooking) {
        toast({
          title: "حجز موجود مسبقاً",
          description: "لديك بالفعل طلب حجز معلق على هذا العقار",
          variant: "destructive",
        });
        return;
      }

      const { data: property, error: propertyError } = await supabase
        .from("properties")
        .select("owner_id")
        .eq("id", propertyId)
        .single();

      if (propertyError || !property) {
        throw new Error("لم يتم العثور على العقار");
      }

      const { data, error } = await supabase
        .from("booking_requests")
        .insert({
          student_id: user.id,
          property_id: propertyId,
          owner_id: property.owner_id,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "حجز موجود مسبقاً",
            description: "لديك بالفعل طلب حجز معلق على هذا العقار",
            variant: "destructive",
          });
        } else if (error.message.includes("إكمال الملف الشخصي")) {
          toast({
            title: "يجب إكمال الملف الشخصي",
            description: error.message,
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "تم إرسال طلب الحجز! ✅",
        description: `تم إرسال طلب حجز ${propertyTitle} بنجاح. سيتم إشعارك عند قبول الحجز.`,
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message || "فشل إرسال طلب الحجز",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setTimeout(() => setIsProcessing(false), 2000);
    }
  };

  if (isOwner) {
    return (
      <div className="w-full p-4 bg-muted rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          هذا عقارك - لا يمكنك حجزه
        </p>
      </div>
    );
  }

  return (
    <Button
      onClick={handleReservation}
      disabled={disabled || loading || isProcessing}
      className="w-full"
      size="lg"
    >
      {loading || isProcessing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          جاري الحجز...
        </>
      ) : (
        "احجز الآن"
      )}
    </Button>
  );
};
