import { Button } from "@/components/ui/button";
import { Home, Building2, UserCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { NotificationCenter } from "./NotificationCenter";

const Navbar = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-2xl font-bold text-primary">سكنك</span>
          </Link>

          <div className="flex items-center gap-2">
            {session ? (
              <>
                <NotificationCenter />
                <Button variant="ghost" onClick={() => navigate("/dashboard")}>
                  <Building2 className="h-5 w-5 mr-2" />
                  الرئيسية
                </Button>
                <Button variant="ghost" onClick={() => navigate("/profile")}>
                  <UserCircle className="h-5 w-5 mr-2" />
                  الملف الشخصي
                </Button>
                <Button variant="outline" onClick={handleLogout}>
                  تسجيل الخروج
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/auth">تسجيل الدخول</Link>
                </Button>
                <Button asChild>
                  <Link to="/auth">ابدأ الآن</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;