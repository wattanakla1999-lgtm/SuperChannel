export type LoginInput = {
  email: string;
  password: string;
  rememberMe: boolean;
};

export type AuthenticatedUser = {
  email: string;
  id: string;
  name: string;
  organizationName: string;
  role: string;
};

export type LoginResponse = {
  user: AuthenticatedUser;
};
