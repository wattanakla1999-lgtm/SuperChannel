"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/http/api-error";
import { login } from "../services/login-service";
import type { LoginInput } from "../types/auth";

type FormErrors = Partial<Record<keyof LoginInput, string>>;

const initialValues: LoginInput = {
  email: "",
  password: "",
  rememberMe: true,
};

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<
    string | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);
  const isBusy = isSubmitting;

  const handleChange =
    (field: keyof LoginInput) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue =
        field === "rememberMe" ? event.target.checked : event.target.value;

      setValues((current) => ({
        ...current,
        [field]: nextValue,
      }));

      setErrors((current) => ({
        ...current,
        [field]: undefined,
      }));

      if (field !== "rememberMe") {
        setFormError(null);
      }
    };

  const validate = () => {
    const nextErrors: FormErrors = {};
    const normalizedEmail = values.email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Please enter your email address";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!values.password) {
      nextErrors.password = "Please enter your password";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setForgotPasswordMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        ...values,
        email: values.email.trim(),
      });

      window.location.assign("/inbox");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again.";
      setFormError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="text-sm font-semibold text-slate-800 dark:text-slate-200"
        >
          Email address
        </label>
        <Input
          id="email"
          name="email"
          autoComplete="email"
          error={errors.email}
          placeholder="admin@superchannel.local"
          value={values.email}
          onChange={handleChange("email")}
        />
        {errors.email ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{errors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-slate-800 dark:text-slate-200"
          >
            Password
          </label>
          <button
            type="button"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
        </div>
        <Input
          id="password"
          name="password"
          autoComplete="current-password"
          error={errors.password}
          placeholder="Enter your password"
          type={showPassword ? "text" : "password"}
          value={values.password}
          onChange={handleChange("password")}
        />
        {errors.password ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">{errors.password}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Checkbox
          id="rememberMe"
          checked={values.rememberMe}
          label="Remember me"
          onChange={handleChange("rememberMe")}
        />
        <button
          type="button"
          className="text-left text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 sm:text-right"
          onClick={() =>
            setForgotPasswordMessage(
              "Password reset is unavailable in the mock environment. Use the demo credentials provided in the spec.",
            )
          }
        >
          Forgot password?
        </button>
      </div>

      {forgotPasswordMessage ? <Alert>{forgotPasswordMessage}</Alert> : null}
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <Button
        type="submit"
        loading={isBusy}
        aria-busy={isBusy}
        aria-disabled={isBusy}
      >
        {isBusy ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
