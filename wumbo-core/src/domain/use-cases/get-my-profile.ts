import { NotFoundError } from "../errors/not-found-error";
import type { IdentityActor } from "../entities/actor";
import type { MyProfile } from "../entities/profile";
import type { PrivateProfilesRepository } from "../ports/private-profiles-repository";
import type { PublicProfilesRepository } from "../ports/public-profiles-repository";
import type { UsersRepository } from "../ports/users-repository";

export interface GetMyProfileInput {
  actor: IdentityActor;
}

export interface GetMyProfileResult {
  profile: MyProfile;
}

interface GetMyProfileUseCaseDependencies {
  users: UsersRepository;
  publicProfiles: PublicProfilesRepository;
  privateProfiles: PrivateProfilesRepository;
}

export function createGetMyProfileUseCase({
  users,
  publicProfiles,
  privateProfiles,
}: GetMyProfileUseCaseDependencies) {
  return async (input: GetMyProfileInput): Promise<GetMyProfileResult> => {
    const user = await users.findByCognitoSubject(input.actor.subject);

    if (!user) {
      throw new NotFoundError("Current user has not been initialized yet.");
    }

    const [publicProfile, privateProfile] = await Promise.all([
      publicProfiles.findByUserId(user.id),
      privateProfiles.findByUserId(user.id),
    ]);

    return {
      profile: {
        userId: user.id,
        cognitoSubject: user.cognitoSubject,
        email: user.email,
        publicProfile,
        privateProfile,
      },
    };
  };
}
