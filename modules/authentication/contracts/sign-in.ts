export type SignInInput = {
  email: string;
  password: string;
};

export type SignInResult = {
  success: boolean;
  redirectTo?: string;
};
