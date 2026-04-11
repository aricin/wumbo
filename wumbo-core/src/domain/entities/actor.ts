export interface IdentityActor {
  subject: string;
  source: "jwt" | "dev-header";
  email?: string;
  groups: string[];
}

export interface DomainActor extends IdentityActor {
  userId: string;
}

export function isAdmin(actor: Pick<IdentityActor, "groups">): boolean {
  return actor.groups.includes("admin");
}
