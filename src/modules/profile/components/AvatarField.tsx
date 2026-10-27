import { useId, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { AppAvatar, AppButton } from "@/components/ui";
import type { Profile } from "@/contracts";
import { isApiError } from "@/lib/errors";
import { AVATAR_ACCEPTED_TYPES, AvatarError, prepareAvatar } from "../avatar";
import { useRemoveAvatar, useSetAvatar } from "../hooks";

/**
 * AvatarField — "Avatar: [foto] Alterar · Remover" (Figma). O arquivo é validado e reduzido no
 * navegador (≤ 256 px) e a troca é aplicada na hora (não depende do "Salvar" do formulário).
 */
export function AvatarField({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const errorId = useId();
  const [error, setError] = useState<string | null>(null);
  const setAvatar = useSetAvatar();
  const removeAvatar = useRemoveAvatar();
  const busy = setAvatar.isPending || removeAvatar.isPending;

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await prepareAvatar(file);
      await setAvatar.mutateAsync(dataUrl);
      toast.success("Avatar atualizado.");
    } catch (failure) {
      setError(
        failure instanceof AvatarError
          ? failure.message
          : isApiError(failure)
            ? (failure.fieldError("dataUrl") ?? failure.message)
            : "Não foi possível atualizar o avatar.",
      );
    }
  }

  async function handleRemove() {
    setError(null);
    try {
      await removeAvatar.mutateAsync();
      toast.success("Avatar removido.");
    } catch (failure) {
      setError(isApiError(failure) ? failure.message : "Não foi possível remover o avatar.");
    }
  }

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <span id={labelId} className="text-sm text-foreground">
        Avatar
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <AppAvatar src={profile.avatarUrl} name={profile.displayName} size="lg" />
        <AppButton
          size="md"
          isLoading={setAvatar.isPending}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-describedby={error ? errorId : undefined}
        >
          Alterar
        </AppButton>
        <AppButton variant="ghost" size="md" disabled={busy || !profile.avatarUrl} isLoading={removeAvatar.isPending} onClick={handleRemove}>
          Remover
        </AppButton>
        {/* Campo de arquivo real, fora do fluxo de Tab (o botão "Alterar" é o controle visível). */}
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ACCEPTED_TYPES.join(",")}
          aria-label="Selecionar imagem do avatar"
          tabIndex={-1}
          className="sr-only"
          onChange={handleFile}
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
