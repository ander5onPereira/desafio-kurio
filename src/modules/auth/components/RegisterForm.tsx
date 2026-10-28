import { useState, type Ref } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { AppButton, AppFormField, AppInput, AppPasswordInput } from "@/components/ui";
import { announce } from "@/components/shared";
import { registerFormSchema, type RegisterFormValues } from "../schemas";
import { useAuth } from "../useAuth";
import { applyApiErrorToForm } from "./formErrors";

interface RegisterFormProps {
  onSuccess: () => void;
  firstFieldRef?: Ref<HTMLInputElement>;
}

export function RegisterForm({ onSuccess, firstFieldRef }: RegisterFormProps) {
  const { register: registerAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: { username: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ confirmPassword: _confirmPassword, ...body }) => {
    setFormError(null);
    try {
      await registerAccount(body);
      announce("Conta criada com sucesso. Você já está conectado.");
      onSuccess();
    } catch (error) {
      setFormError(applyApiErrorToForm(error, setError, ["username", "email", "password"]));
    }
  });

  const usernameField = register("username");

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-label="Criar conta">
      <AppFormField label="Nome de usuário" hideLabel required error={errors.username?.message}>
        {(field) => (
          <AppInput
            {...usernameField}
            {...field}
            ref={(element) => {
              usernameField.ref(element);
              if (typeof firstFieldRef === "function") firstFieldRef(element);
              else if (firstFieldRef) firstFieldRef.current = element;
            }}
            autoComplete="username"
            autoCapitalize="none"
            placeholder="Nome de usuário"
          />
        )}
      </AppFormField>

      <AppFormField label="E-mail" hideLabel required error={errors.email?.message}>
        {(field) => (
          <AppInput
            {...register("email")}
            {...field}
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Digite seu e-mail"
          />
        )}
      </AppFormField>

      <AppFormField
        label="Senha"
        hideLabel
        required
        helper="Mínimo de 8 caracteres, com letra e número."
        error={errors.password?.message}
      >
        {(field) => (
          <AppPasswordInput {...register("password")} {...field} autoComplete="new-password" placeholder="Senha" />
        )}
      </AppFormField>

      <AppFormField label="Confirmar senha" hideLabel required error={errors.confirmPassword?.message}>
        {(field) => (
          <AppPasswordInput
            {...register("confirmPassword")}
            {...field}
            autoComplete="new-password"
            placeholder="Confirmar senha"
          />
        )}
      </AppFormField>

      {formError && (
        <p role="alert" className="flex items-start gap-2 rounded-sm bg-danger-surface px-3 py-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {formError}
        </p>
      )}

      <AppButton type="submit" size="lg" isLoading={isSubmitting} className="w-full rounded-sm">
        Criar conta
      </AppButton>
    </form>
  );
}
