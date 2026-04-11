import { NotFoundError } from "../errors/not-found-error";
import type { PublicProfile } from "../entities/profile";
import type { PublicProfilesRepository } from "../ports/public-profiles-repository";

export interface GetPublicProfileInput {
  handle: string;
}

export interface GetPublicProfileResult {
  profile: PublicProfile;
}

interface GetPublicProfileUseCaseDependencies {
  publicProfiles: PublicProfilesRepository;
}

export function createGetPublicProfileUseCase({
  publicProfiles,
}: GetPublicProfileUseCaseDependencies) {
  return async (input: GetPublicProfileInput): Promise<GetPublicProfileResult> => {
    const profile = await publicProfiles.findByHandle(input.handle);

    if (!profile) {
      throw new NotFoundError("Profile not found.");
    }

    return {
      profile,
    };
  };
}
