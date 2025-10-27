import { signInSchema } from "@/lib/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Link, useNavigate } from "react-router";
import { useSignInMutation } from "@/hooks/use-auth";
import { useAuth } from "../../provider/auth-context";
import { toast } from "sonner";

type SigninFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const navigate = useNavigate();
  const { forceAuthCheck } = useAuth();
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Please sign in to continue.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleOnSubmit)}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="johndoe@gmail.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link
                        to="/forgot-password"
                        className="text-sm text-blue-600"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="********"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <CardFooter className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/sign-up" className="text-primary">
                  Sign Up
                </Link>
              </div>
            </div>
          </CardFooter>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;
