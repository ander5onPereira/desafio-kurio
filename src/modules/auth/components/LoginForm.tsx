import { useState, type Ref } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { AppButton, AppComingSoon, AppFormField, AppInput, AppPasswordInput } from "@/components/ui";
import { announce } from "@/components/shared";
import { loginFormSchema, type LoginFormValues } from "../schemas";
import { useAuth } from "../useAuth";
import { applyApiErrorToForm } from "./formErrors";

interface LoginFormProps {
  onSuccess: () => void;
  firstFieldRef?: Ref<HTMLInputElement>;
}

export function LoginForm({ onSuccess, firstFieldRef }: LoginFormProps) {
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      announce("Login realizado com sucesso.");
      onSuccess();
    } catch (error) {
      setFormError(applyApiErrorToForm(error, setError, ["email", "password"]));
    }
  });

  const emailField = register("email");

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-label="Entrar">
      <AppFormField label="E-mail" hideLabel required error={errors.email?.message}>
        {(field) => (
          <AppInput
            {...emailField}
            {...field}
            ref={(element) => {
              emailField.ref(element);
              if (typeof firstFieldRef === "function") firstFieldRef(element);
              else if (firstFieldRef) firstFieldRef.current = element;
            }}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="contato@email.com"
          />
        )}
      </AppFormField>

      <div className="flex flex-col gap-2">
        <AppFormField label="Senha" hideLabel required error={errors.password?.message}>
          {(field) => <AppPasswordInput {...register("password")} {...field} placeholder="Senha" />}
        </AppFormField>
        <div className="flex justify-end text-xs">
          <AppComingSoon className="text-accent-foreground">Esqueceu a senha?</AppComingSoon>
        </div>
      </div>

      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-sm bg-danger-surface px-3 py-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <AppButton type="submit" size="lg" isLoading={isSubmitting} className="w-full rounded-sm">
        Entrar
      </AppButton>
    </form>
  );
}
