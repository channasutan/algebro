import { type DomainEvent } from "./event-types";

export const AUTH_USER_REGISTERED = "auth_user_registered";

export type AuthUserRegisteredPayload = {
  userId: string;
  email: string;
  registeredAt: string;
  source: string;
};

export type AuthUserRegisteredEvent = DomainEvent<AuthUserRegisteredPayload>;
