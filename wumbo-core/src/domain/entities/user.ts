export type UserStatus = "active";

export interface User {
  id: string;
  cognitoSubject: string;
  email?: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
