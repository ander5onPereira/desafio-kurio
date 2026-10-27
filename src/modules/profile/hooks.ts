import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChangePasswordBody, Profile, UpdateProfileBody } from "@/contracts";
import type { ApiError } from "@/lib/errors";
import { keys, scopeOf } from "@/lib/queryKeys";
import { useAuth } from "@/modules/auth";
import { profileApi } from "./api";

function useProfileScope() {
  const { user } = useAuth();
  return { userId: user?.id ?? null, scope: scopeOf(user?.id) };
}

/** Perfil do colecionador logado (5 min de frescor; muda só por ação do próprio usuário). */
export function useProfile() {
  const { userId, scope } = useProfileScope();
  return useQuery<Profile, ApiError>({
    queryKey: keys.profile(scope),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * Efeito comum das mutations de perfil: grava o perfil devolvido pela API no cache e pede
 * ao módulo de sessão que reveja o usuário (Header/menu mostram nome e avatar atualizados).
 */
function useApplyProfile() {
  const queryClient = useQueryClient();
  const { scope } = useProfileScope();
  return (profile: Profile) => {
    queryClient.setQueryData<Profile>(keys.profile(scope), profile);
    void queryClient.invalidateQueries({ queryKey: keys.profile(scope) });
    void queryClient.invalidateQueries({ queryKey: keys.session() });
  };
}

export function useUpdateProfile() {
  const applyProfile = useApplyProfile();
  return useMutation<Profile, ApiError, UpdateProfileBody>({
    mutationFn: (body) => profileApi.update(body),
    onSuccess: applyProfile,
  });
}

export function useSetAvatar() {
  const applyProfile = useApplyProfile();
  return useMutation<Profile, ApiError, string>({
    mutationFn: (dataUrl) => profileApi.setAvatar(dataUrl),
    onSuccess: applyProfile,
  });
}

export function useRemoveAvatar() {
  const applyProfile = useApplyProfile();
  return useMutation<Profile, ApiError, void>({
    mutationFn: () => profileApi.removeAvatar(),
    onSuccess: applyProfile,
  });
}

export function useChangePassword() {
  return useMutation<unknown, ApiError, ChangePasswordBody>({
    mutationFn: (body) => profileApi.changePassword(body),
  });
}
