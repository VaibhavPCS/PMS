import { postData } from "@/lib/fetch-util";
import type { SignupFormData } from "@/routes/auth/sign-up";
import { useMutation } from "@tanstack/react-query";

export const useSignUpMutation = () => {
  return useMutation({
    mutationFn: (data: SignupFormData) => postData("/auth/register", data),
  });
};

export const useVerifyEmailMutation = () => {
  return useMutation({
    mutationFn: (data: { token: string }) =>
      postData("/auth/verify-email", data),
  });
};

export const useSignInMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; password: string }) =>
      postData("/auth/login", data),
  });
};

export const useVerifyOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string; type: string }) => 
      postData('/auth/verify-email', { 
        token: {
          userId: data.userId,
          otp: data.otp,
          type: data.type
        }
      }),
  });
};


export const useResendOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string }) =>
      postData("/auth/resend-otp", data),
  });
};

// NEW: Password Reset Mutations
export const useForgotPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string }) =>
      postData("/auth/forgot-password", data),
  });
};

export const useVerifyResetOTPMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; otp: string }) =>
      postData("/auth/verify-reset-otp", data),
  });
};

export const useResetPasswordMutation = () => {
  return useMutation({
    mutationFn: (data: { userId: string; resetToken: string; newPassword: string }) =>
      postData("/auth/reset-password", data),
  });
};