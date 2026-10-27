import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { AppButton, AppFormField, AppInput, AppModal } from "@/components/ui";
import { searchDialog, useSearchDialogOpen } from "./searchDialogStore";

/**
 * SearchDialog — busca global. Enviar leva ao catálogo com `?q=` (o catálogo é a fonte da verdade
 * do estado de busca, que vive na URL). Montado UMA vez no root.
 */
export function SearchDialog() {
  const open = useSearchDialogOpen();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    // `history.push` com URL pronta evita acoplar este componente ao schema de search da rota "/".
    router.history.push(q ? `/?q=${encodeURIComponent(q)}#catalogo` : "/#catalogo");
    searchDialog.close();
    setQuery("");
  }

  return (
    <AppModal
      open={open}
      onOpenChange={searchDialog.set}
      title="Buscar NFTs"
      description="Pesquise pelo nome do NFT ou da coleção."
      size="sm"
      initialFocusRef={inputRef}
    >
      <form role="search" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AppFormField label="Buscar NFTs" hideLabel>
          {(field) => (
            <AppInput
              {...field}
              ref={inputRef}
              type="search"
              name="q"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: Emerald Ape"
              leftIcon={<Search className="size-4" />}
              autoComplete="off"
            />
          )}
        </AppFormField>
        <AppButton type="submit">Buscar</AppButton>
      </form>
    </AppModal>
  );
}
