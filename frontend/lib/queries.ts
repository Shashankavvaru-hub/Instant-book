import { api } from "./api";
import { Booking, BookingDetail, Event, EventSeat, Payment, User } from "@/types";

// ── Auth ──────────────────────────────────────────────────────────────────────
export const fetchMe = async (): Promise<User> => {
  const res = await api.get("/auth/me");
  return res.data.user;
};

export const loginApi = async (data: { email: string; password: string }) => {
  const res = await api.post("/auth/login", data);
  return res.data.user as User;
};

export const signupApi = async (data: {
  firstName: string;
  lastName?: string;
  email: string;
  password: string;
}) => {
  const res = await api.post("/auth/signup", data);
  return res.data.user as User;
};

export const logoutApi = async () => {
  await api.post("/auth/logout");
};

// ── Events ───────────────────────────────────────────────────────────────────
export const fetchEvents = async (): Promise<Event[]> => {
  const res = await api.get("/events");
  return res.data.events;
};

export const fetchEventById = async (id: number): Promise<Event> => {
  const res = await api.get(`/events/${id}`);
  return res.data.event;
};

export const fetchEventSeats = async (id: number): Promise<EventSeat[]> => {
  const res = await api.get(`/events/${id}/seats`);
  return res.data.seats;
};

// ── Bookings ─────────────────────────────────────────────────────────────────
export const fetchMyBookings = async (): Promise<Booking[]> => {
  const res = await api.get("/bookings/my");
  return res.data.bookings;
};

export const fetchBookingById = async (id: number): Promise<BookingDetail> => {
  const res = await api.get(`/bookings/${id}`);
  return res.data.booking;
};

export const holdSeats = async (eventId: number, eventSeatIds: number[]) => {
  const res = await api.post("/bookings", { eventId, eventSeatIds });
  return res.data;
};

export const cancelBooking = async (bookingId: number) => {
  const res = await api.delete(`/bookings/${bookingId}`);
  return res.data;
};

// ── Payments ─────────────────────────────────────────────────────────────────
export const createPayment = async (bookingId: number): Promise<Payment> => {
  const res = await api.post("/payments/create", { bookingId });
  return res.data.data;
};

// ── Tickets ──────────────────────────────────────────────────────────────────
export const verifyTicket = async (bookingReference: string) => {
  const res = await api.post("/tickets/verify", { bookingReference });
  return res.data;
};
