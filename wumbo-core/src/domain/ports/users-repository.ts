import type { User } from "../entities/user";

export interface UserIdentity {
  identityUserId: string;
  subject: string;
  email?: string;
}

export interface UpsertUserFromIdentityResult {
  user: User;
  created: boolean;
  emailUpdated: boolean;
}

export interface UsersRepository {
  findByCognitoSubject(subject: string): Promise<User | null>;
  upsertFromIdentity(identity: UserIdentity): Promise<UpsertUserFromIdentityResult>;
}
