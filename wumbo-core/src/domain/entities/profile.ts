export interface PublicProfile {
  userId: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateProfile {
  userId: string;
  legalName?: string;
  phoneNumber?: string;
  contactEmail?: string;
  city?: string;
  stateRegion?: string;
  countryCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyProfile {
  userId: string;
  cognitoSubject: string;
  email?: string;
  publicProfile: PublicProfile | null;
  privateProfile: PrivateProfile | null;
}
