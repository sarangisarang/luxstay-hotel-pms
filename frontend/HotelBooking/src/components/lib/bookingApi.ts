/**
 * @file bookingApi.ts
 * Thin API client for the {@code /api/bookings} endpoints.
 * Uses the shared Axios instance from {@link axiosConfig} so JWT injection
 * and token refresh are handled automatically.
 */
import api from "@/components/lib/axiosConfig";

/** Shape of a booking resource returned by the backend. */
export type BookingDTO = {
    id: string;
    guestId: string;
    guestName?: string;
    roomId?: string;
    roomNumber?: string | number;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number | string;
    services?: { id: string; name: string; price: number | string }[];
    roomPricePerNight?: number | string;
};

/**
 * Fetches a single booking by its UUID.
 *
 * @param id - UUID of the booking to retrieve.
 * @returns The resolved {@link BookingDTO}.
 * @throws AxiosError on 4xx / 5xx responses.
 */
export async function getBookingById(id: string): Promise<BookingDTO> {
    const { data } = await api.get<BookingDTO>(`/api/bookings/${id}`);
    return data;
}
