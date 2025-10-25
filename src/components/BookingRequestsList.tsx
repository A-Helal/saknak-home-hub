import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BookingRequestsListProps {
  onRequestUpdate?: () => void;
}

const BookingRequestsList = ({ onRequestUpdate }: BookingRequestsListProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    requestId: string;
    status: "accepted" | "rejected";
  } | null>(null);

  useEffect(() => {
    fetchBookingRequests();
  }, []);

  const fetchBookingRequests = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      // First try with user_id foreign key, fallback to join
      let data, error;
      
      try {
        const result = await supabase
          .from("booking_requests")
          .select(
            `
            *,
            properties (title, address, rental_type, price),
            profiles!booking_requests_student_id_fkey (full_name, phone)
          `
          )
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });
        
        data = result.data;
        error = result.error;
      } catch (e) {
        // Fallback: manual join if foreign key not found
        const result = await supabase
          .from("booking_requests")
          .select("*")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });
        
        if (result.error) throw result.error;
        
        // Manually fetch related data
        const bookingsWithData = await Promise.all(
          (result.data || []).map(async (booking) => {
            const [propertyRes, profileRes] = await Promise.all([
              supabase.from("properties").select("title, address, rental_type, price").eq("id", booking.property_id).single(),
              supabase.from("profiles").select("full_name, phone").eq("id", booking.student_id).single()
            ]);
            
            return {
              ...booking,
              properties: propertyRes.data,
              profiles: profileRes.data
            };
          })
        );
        
        data = bookingsWithData;
        error = null;
      }

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching booking requests:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل طلبات الحجز",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusClick = (requestId: string, status: "accepted" | "rejected") => {
    setPendingAction({ requestId, status });
    setActionDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!pendingAction) return;

    try {
      const { error } = await supabase
        .from("booking_requests")
        .update({ status: pendingAction.status })
        .eq("id", pendingAction.requestId);

      if (error) throw error;

      toast({
        title: pendingAction.status === "accepted" ? "تم القبول" : "تم الرفض",
        description: `تم ${pendingAction.status === "accepted" ? "قبول" : "رفض"} طلب الحجز`,
      });

      fetchBookingRequests();
      onRequestUpdate?.();
    } catch (error: any) {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionDialogOpen(false);
      setPendingAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "قيد الانتظار", variant: "secondary" as const, icon: Clock },
      accepted: { label: "مقبول", variant: "default" as const, icon: Check },
      rejected: { label: "مرفوض", variant: "destructive" as const, icon: X },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لا توجد طلبات حجز حتى الآن</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="shadow-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg mb-2">
                  {request.properties?.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {request.properties?.address}
                </p>
              </div>
              {getStatusBadge(request.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">اسم الطالب</p>
                <p className="font-medium">{request.profiles?.full_name || "غير متوفر"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">رقم الهاتف</p>
                <p className="font-medium">{request.profiles?.phone || "غير متوفر"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">السعر الشهري</p>
                <p className="font-medium">{request.properties?.price} جنيه</p>
              </div>
              <div>
                <p className="text-muted-foreground">تاريخ الطلب</p>
                <p className="font-medium">
                  {new Date(request.created_at).toLocaleDateString("ar-EG")}
                </p>
              </div>
              {request.deposit_amount && (
                <div>
                  <p className="text-muted-foreground">مبلغ العربون</p>
                  <p className="font-medium">{request.deposit_amount} جنيه</p>
                </div>
              )}
              {request.vodafone_number && request.status === 'pending' && (
                <div>
                  <p className="text-muted-foreground">رقم فودافون كاش</p>
                  <p className="font-medium">{request.vodafone_number}</p>
                </div>
              )}
              {request.payment_confirmed && (
                <div className="col-span-2">
                  <Badge variant="default" className="bg-green-500">
                    تم تأكيد الدفع ✓
                  </Badge>
                </div>
              )}
              {request.expires_at && request.status === 'pending' && !request.payment_confirmed && (
                <div className="col-span-2">
                  <p className="text-sm text-destructive">
                    ينتهي في: {new Date(request.expires_at).toLocaleString("ar-EG")}
                  </p>
                </div>
              )}
            </div>

            {request.message && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">رسالة الطالب</p>
                <p className="text-sm bg-muted p-3 rounded-lg">{request.message}</p>
              </div>
            )}

            {request.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleStatusClick(request.id, "accepted")}
                  className="flex-1"
                  size="sm"
                >
                  <Check className="h-4 w-4 ml-2" />
                  قبول
                </Button>
                <Button
                  onClick={() => handleStatusClick(request.id, "rejected")}
                  variant="destructive"
                  className="flex-1"
                  size="sm"
                >
                  <X className="h-4 w-4 ml-2" />
                  رفض
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.status === "accepted" ? "تأكيد القبول" : "تأكيد الرفض"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.status === "accepted"
                ? "هل أنت متأكد من قبول طلب الحجز هذا؟"
                : "هل أنت متأكد من رفض طلب الحجز هذا؟"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpdateStatus}>
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BookingRequestsList;