import { endpoints } from "@/contracts";
import { changePassword, getProfile, setAvatar, updateProfile } from "../services/profile";
import { noContent, ok, route } from "./route";

export const profileHandlers = (base: string) => [
  route(base, endpoints.profile.get, ({ requireUser }) => ok(getProfile(requireUser()))),
  route(base, endpoints.profile.update, ({ requireUser, body }) => ok(updateProfile(requireUser(), body))),
  route(base, endpoints.profile.setAvatar, ({ requireUser, body }) => ok(setAvatar(requireUser(), body.dataUrl))),
  route(base, endpoints.profile.removeAvatar, ({ requireUser }) => ok(setAvatar(requireUser(), null))),
  route(base, endpoints.profile.changePassword, async ({ requireUser, body }) => {
    await changePassword(requireUser(), body);
    return noContent();
  }),
];
