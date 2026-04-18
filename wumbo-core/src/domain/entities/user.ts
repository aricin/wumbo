export type UserStatus = "active";

export interface User {
  id: string;
  identityUserId?: string;
  cognitoSubject: string;
  email?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
