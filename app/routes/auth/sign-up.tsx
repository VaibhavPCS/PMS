import { signUpSchema } from "@/lib/schema";
import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
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
import { useSignUpMutation } from "@/hooks/use-auth";
import { toast } from "sonner";
import AuthPanelLayout from "@/components/layout/auth-panel-layout";

export type SignupFormData = z.infer<typeof signUpSchema>;

const SignUp = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [hasErrors, setHasErrors] = useState(false);
  const [showScrollHint, setShowScrollHint] = useState(false);
  
  // Refs for scroll management
  const formContainerRef = useRef<HTMLDivElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      confirmPassword: "",
    },
  });

  const { mutate, isPending } = useSignUpMutation();

  // Smooth scroll function with animation
  const smoothScrollToElement = (element: HTMLElement, duration: number = 400) => {
    const container = formContainerRef.current;
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const scrollTop = container.scrollTop;
    const targetScrollTop = scrollTop + elementRect.bottom - containerRect.bottom + 20; // 20px padding

    if (targetScrollTop <= scrollTop) return; // Element is already visible

    const startTime = performance.now();
    const startScrollTop = scrollTop;
    const distance = targetScrollTop - startScrollTop;

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
      const easedProgress = easeInOutCubic(progress);
      
      container.scrollTop = startScrollTop + distance * easedProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Check if content overflows and show scroll hint
  const checkOverflow = () => {
    const container = formContainerRef.current;
    if (!container) return;
    
    const isOverflowing = container.scrollHeight > container.clientHeight;
    setShowScrollHint(isOverflowing && hasErrors);
  };

  // Error detection effect
  useEffect(() => {
    const errors = form.formState.errors;
    const hasFormErrors = Object.keys(errors).length > 0;
    setHasErrors(hasFormErrors);

    if (hasFormErrors && submitButtonRef.current) {
      // Small delay to allow error messages to render
      setTimeout(() => {
        smoothScrollToElement(submitButtonRef.current!, 400);
        checkOverflow();
      }, 100);
    }
  }, [form.formState.errors]);

  // Check overflow on mount and resize
  useEffect(() => {
    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hasErrors]);

  const handleOnSubmit = (values: SignupFormData) => {
    mutate(values, {
      onSuccess: (data: any) => {
        toast.success("Registration Initiated", {
          description:
            "Please check your email for a 6-digit OTP to complete your registration.",
        });

        form.reset();

        navigate("/verify-otp", {
          state: {
            userId: data.userId,
            email: values.email,
            type: 'registration',
            message: 'Please enter the 6-digit OTP sent to your email to complete registration.'
          }
        });
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.message || "An error occurred";
        console.log(error);
        toast.error(errorMessage);
      },
    });
  };

  return (
    <AuthPanelLayout>
      <div ref={formContainerRef} className="flex flex-col gap-6 relative">
        {/* Header */}
        <div className="flex flex-col gap-2.5">
          <h1 className="text-2xl font-semibold text-[#1a1a1a]">Create an Account</h1>
          <p className="text-sm text-gray-500">Create an account to continue</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-5">
          <Form {...form}>
            <form ref={formRef} onSubmit={form.handleSubmit(handleOnSubmit)} noValidate className="flex flex-col gap-4">
              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter Email"
                        className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Full Name Field */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Full Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter Name"
                        className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 text-sm placeholder:text-gray-500"
                        {...field}
                      />
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

              {/* Confirm Password Field */}
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm text-[#333333] px-4">Confirm Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Enter password"
                          className="h-12 bg-[#f2f2f2] border-[0.5px] border-neutral-200 rounded-md px-4 pr-12 text-sm placeholder:text-gray-500"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-[#4d4d4d] hover:text-[#1a1a1a]"
                        >
                          {showConfirmPassword ? (
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

              {/* Remember Me Checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-signup"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  className="w-4 h-4 border-2 border-[#949291] rounded-[2px]"
                />
                <label
                  htmlFor="remember-signup"
                  className="text-sm text-[#1a1a1a] cursor-pointer"
                >
                  Remember me
                </label>
              </div>

              {/* Create Account Button */}
              <Button
                ref={submitButtonRef}
                type="submit"
                disabled={isPending}
                className="w-full h-10 bg-[#007aff] hover:bg-[#0066cc] text-white font-bold text-[15px] rounded-md px-6 py-2.5 transition-colors"
              >
                {isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>
        </div>

        {/* Divider */}
        <div className="h-[0.5px] bg-neutral-200 w-full" />

        {/* Sign In Link */}
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-[#1a1a1a]">Already have an account?</span>
          <Link to="/sign-in" className="text-[#007aff] hover:underline">
            Sign in
          </Link>
        </div>

        {/* Scroll Hint Indicator */}
        {showScrollHint && (
          <div className="absolute bottom-2 right-2 flex flex-col items-center gap-1 text-gray-500 animate-bounce">
            <div className="text-xs font-medium">Scroll down</div>
            <svg 
              className="w-4 h-4" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 14l-7 7m0 0l-7-7m7 7V3" 
              />
            </svg>
          </div>
        )}
      </div>
    </AuthPanelLayout>
  );
};

export default SignUp;