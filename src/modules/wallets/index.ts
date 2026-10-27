/*
  API pública do módulo de carteiras (outros módulos importam SÓ daqui).
    useWallets()      — carteiras do usuário (checkout/Agente D usa no pagamento)
    useCreateWallet() / useUpdateWallet()
    EnsNameField / FieldSelect / ENS helpers — campos compartilhados com o formulário de perfil.
  As páginas/formulários NÃO são exportados aqui (code splitting por rota).
*/
export { useCreateWallet, useUpdateWallet, useWallets } from "./hooks";
export { EnsNameField } from "./components/EnsNameField";
export { FieldSelect } from "./components/FieldSelect";
export { ENS_SUFFIXES, joinEnsName, splitEnsName } from "./ens";
export type { EnsSuffix } from "./ens";
