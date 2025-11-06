import { signInSchema } from "@/lib/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router";
import { useSignInMutation } from "@/hooks/use-auth";
import { useAuth } from "../../provider/auth-context";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import AuthPanelLayout from "@/components/layout/auth-panel-layout";

type SigninFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const navigate = useNavigate();
  const { forceAuthCheck } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<SigninFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutate, isPending } = useSignInMutation();

  const handleOnSubmit = (values: SigninFormData) => {
    mutate(values, {
      onSuccess: (data: any) => {
        if (data.requiresOTP) {
          toast.success("OTP Sent", {
            description:
              "Please check your email for a 6-digit OTP to complete login.",
          });
          navigate("/verify-otp", {
            state: {
              userId: data.userId,
              email: values.email,
              type: "login",
              message:
                "Please enter the 6-digit OTP sent to your email to complete login.",
            },
          });
        } else {
          toast.success("Login successful!");

          // Force auth check to update context with HTTP-only cookie
          forceAuthCheck().then(() => {
            navigate("/dashboard");
          }).catch(() => {
            // Even if force check fails, try to navigate
            navigate("/dashboard");
          });
        }
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.message || "An error occurred";

        if (error.response?.data?.needsVerification) {
          toast.error("Email verification required", {
            description: "Please verify your email first.",
          });
          navigate("/verify-otp", {
            state: {
              userId: error.response.data.userId,
              email: values.email,
              type: "registration",
              message: "Please complete your email verification first.",
            },
          });
        } else {
          toast.error(errorMessage);
        }
      },
    });
  };

  return (
    <AuthPanelLayout>
      {/* Form Container */}
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Login</h1>
          <p className="text-sm text-gray-500">Sign in to your account</p>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-5">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleOnSubmit)}
              noValidate
              className="flex flex-col gap-4"
            >
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="email"
                          placeholder="Enter Email"
                          className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 pr-12 text-sm placeholder:text-gray-500"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#4d4d4d] hover:text-[#1a1a1a]"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Remember Me & Forgot Password */}
              {/* <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="w-4 h-4 border-2 border-[#949291] rounded-[2px]"
                  />
                  <label
                    htmlFor="remember"
                    className="text-sm text-[#1a1a1a] cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>
                <Link
                  to="/forgot-password"
                  className="text-xs text-[#007aff] hover:underline"
                >
                  Forgot password?
                </Link>
              </div> */}

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-[#007aff] hover:bg-[#0066cc] text-white font-bold text-[15px] rounded-md px-6 py-2.5 transition-colors"
              >
                {isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </div>
      </div>

      {/* Divider */}
      <div className="h-[0.5px] bg-neutral-200 w-full" />

      {/* Sign Up Link */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[#1a1a1a]">Dont have an account?</span>
        <Link to="/sign-up" className="text-[#007aff] hover:underline">
          Sign up now
        </Link>
      </div>
    </AuthPanelLayout>
  );
};

export default SignIn;
