import type { OrgMembership } from "./org";
import type { User } from "./user";

export interface Me {
  user: User;
  memberships: OrgMembership[];
}

export interface AccessToken {
  access_token: string;
  token_type: string;
}
