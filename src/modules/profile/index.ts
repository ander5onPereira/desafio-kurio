/*
  API pública do módulo de perfil. As páginas/layout NÃO são exportados aqui:
  as rotas importam direto de "@/modules/profile/components/..." (code splitting por rota).
*/
export { useChangePassword, useProfile, useRemoveAvatar, useSetAvatar, useUpdateProfile } from "./hooks";
