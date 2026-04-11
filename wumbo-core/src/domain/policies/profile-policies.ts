import { isAdmin, type DomainActor } from "../entities/actor";

export function canReadPublicProfile(): boolean {
  return true;
}

export function canUpdatePublicProfile(actor: DomainActor, ownerUserId: string): boolean {
  return actor.userId === ownerUserId || isAdmin(actor);
}

export function canReadPrivateProfile(actor: DomainActor, ownerUserId: string): boolean {
  return actor.userId === ownerUserId || isAdmin(actor);
}

export function canUpdatePrivateProfile(actor: DomainActor, ownerUserId: string): boolean {
  return actor.userId === ownerUserId || isAdmin(actor);
}
