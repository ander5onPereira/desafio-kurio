import { AppError, AppSkeleton, AppSkeletonGroup } from "@/components/ui";
import { useProfile } from "../hooks";
import { ProfileForm } from "./ProfileForm";

function ProfileSkeleton() {
  return (
    <AppSkeletonGroup label="Carregando perfil" className="flex flex-col gap-8">
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <AppSkeleton className="h-5 w-32" />
            <AppSkeleton className="h-10 w-full" />
          </div>
        ))}
        <div className="flex flex-col gap-2">
          <AppSkeleton className="h-5 w-16" />
          <AppSkeleton className="h-[3.25rem] w-full max-w-72" />
        </div>
      </div>
      <AppSkeleton className="h-6 w-36" />
      <div className="flex max-w-md flex-col gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-2">
            <AppSkeleton className="h-5 w-28" />
            <AppSkeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <AppSkeleton className="h-10 w-32" />
    </AppSkeletonGroup>
  );
}

export function ProfilePage() {
  const profile = useProfile();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base font-bold text-foreground">Perfil do colecionador</h1>
      {profile.isError ? (
        <AppError error={profile.error} onRetry={() => void profile.refetch()} isRetrying={profile.isRefetching} />
      ) : profile.data ? (
        <ProfileForm key={profile.data.id} profile={profile.data} />
      ) : (
        <ProfileSkeleton />
      )}
    </div>
  );
}
