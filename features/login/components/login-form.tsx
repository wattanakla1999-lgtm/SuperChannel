"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("login");
  const tCommon = useTranslations("common");
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
      nextErrors.email = t("emailRequired");
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = t("emailInvalid");
    }

    if (!values.password) {
      nextErrors.password = t("passwordRequired");
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
          ? error.code === "INVALID_CREDENTIALS"
            ? t("invalidCredentials")
            : tCommon("error")
          : tCommon("error");
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
          {t("email")}
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
            {t("password")}
          </label>
          <button
            type="button"
            className="text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100"
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? t("hidePassword") : t("showPassword")}
          </button>
        </div>
        <Input
          id="password"
          name="password"
          autoComplete="current-password"
          error={errors.password}
          placeholder={t("passwordPlaceholder")}
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
          label={t("remember")}
          onChange={handleChange("rememberMe")}
        />
        <button
          type="button"
          className="text-left text-sm font-medium text-slate-600 transition hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100 sm:text-right"
          onClick={() =>
            setForgotPasswordMessage(
              t("forgotMock"),
            )
          }
        >
          {t("forgot")}
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
        {isBusy ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
