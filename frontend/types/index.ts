// All shared TypeScript types for InstantBook

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName?: string;
  role: "USER" | "ADMIN";
  avatarUrl?: string;
  isVerified: boolean;
}

export interface Event {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  language?: string;
  category?: string;
  startTime: string;
  endTime: string;
  createdAt: string;
}

export interface EventSeat {
  id: number;
  status: "AVAILABLE" | "BOOKED";
  seat: {
    id: number;
    row: string;
    number: number;
  };
}

export interface Booking {
  id: number;
  bookingReference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  totalAmount: string;
  expiresAt: string;
  createdAt: string;
  qrCodeUrl?: string;
  event: {
    id: number;
    title: string;
    startTime: string;
    imageUrl?: string;
  };
  bookingSeats: {
    eventSeat: {
      seat: { row: string; number: number };
    };
  }[];
  payment?: {
    status: string;
    amount: string;
  };
}

export interface BookingDetail {
  id: number;
  totalAmount: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
  expiresAt: string;
  qrCodeUrl?: string;
  event: { id: number; title: string };
  bookingSeats: {
    eventSeat: {
      seat: { row: string; number: number; id: number };
    };
  }[];
}

export interface Payment {
  paymentId: number;
  gatewayOrderId: string;
  amount: number;
  currency: string;
  key: string;
}
