import { callEndpoint } from "@/lib/api";
import { endpoints, type ChangePasswordBody, type UpdateProfileBody } from "@/contracts";

export const profileApi = {
  get: (signal?: AbortSignal) => callEndpoint(endpoints.profile.get, { signal }),
  update: (body: UpdateProfileBody) => callEndpoint(endpoints.profile.update, { body }),
  setAvatar: (dataUrl: string) => callEndpoint(endpoints.profile.setAvatar, { body: { dataUrl } }),
  removeAvatar: () => callEndpoint(endpoints.profile.removeAvatar, {}),
  changePassword: (body: ChangePasswordBody) => callEndpoint(endpoints.profile.changePassword, { body }),
};
