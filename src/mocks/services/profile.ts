import type { ChangePasswordBody, Profile, UpdateProfileBody } from "@/contracts";
import { getDb, mutate } from "../db/store";
import type { DbUser } from "../db/types";
import { hashPassword, verifyPassword } from "../lib/password";
import { toUserDto } from "./auth";
import { ServerError, validation } from "./errors";

export const getProfile = (user: DbUser): Profile => toUserDto(user);

export function updateProfile(user: DbUser, body: UpdateProfileBody): Profile {
  const email = body.email.trim().toLowerCase();
  const username = body.username.trim().toLowerCase();
  const others = Object.values(getDb().users).filter((u) => u.id !== user.id);

  if (others.some((u) => u.email === email)) {
    throw new ServerError(409, "EMAIL_TAKEN", "Este e-mail já está em uso.", { fieldErrors: { email: ["Este e-mail já está em uso."] } });
  }
  if (others.some((u) => u.username === username)) {
    throw new ServerError(409, "USERNAME_TAKEN", "Este nome de usuário já está em uso.", {
      fieldErrors: { username: ["Este nome de usuário já está em uso."] },
    });
  }
  return mutate(() => {
    user.displayName = body.displayName.trim();
    user.username = username;
    user.email = email;
    user.ensName = body.ensName.trim();
    user.walletNickname = body.walletNickname.trim();
    return toUserDto(user);
  });
}

export function setAvatar(user: DbUser, dataUrl: string | null): Profile {
  return mutate(() => {
    user.avatarUrl = dataUrl;
    return toUserDto(user);
  });
}

export async function changePassword(user: DbUser, body: ChangePasswordBody): Promise<void> {
  if (!(await verifyPassword(body.currentPassword, user.salt, user.passwordHash))) {
    throw validation({ currentPassword: ["Senha atual incorreta."] });
  }
  if (body.currentPassword === body.newPassword) {
    throw validation({ newPassword: ["A nova senha deve ser diferente da atual."] });
  }
  const hash = await hashPassword(body.newPassword, user.salt);
  mutate(() => {
    user.passwordHash = hash;
  });
}
