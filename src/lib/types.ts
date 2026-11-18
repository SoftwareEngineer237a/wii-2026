export type BadgeType = "standard" | "vip";

export type RegistrationView = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  badgeType: BadgeType;
  amount: number;
  qrCode: string;
  createdAt: string;
};

export type RegistrationStats = {
  total: number;
  standard: number;
  vip: number;
};
