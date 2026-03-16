export type SignUpInput = {
  email: string;
  password: string;
};

export type SignUpResult = {
  userId: string | null;
  requiresEmailConfirmation: boolean;
};
