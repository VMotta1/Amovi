import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../providers/AuthProvider";
import { BRAND_LOGO_SRC } from "../lib/branding";
import { useI18n } from "../providers/I18nProvider";

export default function Auth() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [navigate, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          throw error;
        }

        navigate("/", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        navigate("/", { replace: true });
      } else {
        setStatusMessage(t("auth.accountCreated"));
        setIsLogin(true);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("auth.authFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <img
            src={BRAND_LOGO_SRC}
            alt="Bambuu logo"
            className="mx-auto mb-5 h-24 w-24 object-contain"
          />
          <h1
            className="mb-3 text-5xl uppercase tracking-[0.26em]"
            style={{ fontFamily: '"Montserrat", sans-serif' }}
          >
            BAMBUU
          </h1>
          <p className="text-lg text-muted-foreground">{t("auth.subtitle")}</p>
        </div>

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
          <h2 className="mb-6 text-center">
            {isLogin ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}
            {statusMessage ? (
              <div className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">
                {statusMessage}
              </div>
            ) : null}
            {!isLogin && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                  <User className="size-4" />
                  {t("auth.fullName")}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  required={!isLogin}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                <Mail className="size-4" />
                {t("auth.email")}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-1">
                <Lock className="size-4" />
                {t("auth.password")}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg hover:opacity-90 transition-opacity mt-6"
            >
              {isSubmitting ? t("auth.pleaseWait") : isLogin ? t("auth.signIn") : t("auth.createAccountButton")}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setErrorMessage("");
                setStatusMessage("");
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? (
                <>
                  {t("auth.noAccount")}{" "}
                  <span className="text-primary font-medium">{t("auth.signUp")}</span>
                </>
              ) : (
                <>
                  {t("auth.haveAccount")}{" "}
                  <span className="text-primary font-medium">{t("auth.signIn")}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          {t("auth.footer")}
        </p>
      </div>
    </div>
  );
}
