/**
 * @file invoiceApi.ts
 * API client for all {@code /api/invoices} endpoints.
 * Uses the shared Axios instance so JWT injection and token refresh are handled automatically.
 */
import api from "@/components/lib/axiosConfig";

/** Shape of an invoice resource returned by the backend. */
export type InvoiceDTO = {
    id: string;
    bookingId: string;
    amount: number;
    issuedDate?: string;
    status: "GENERATED" | "SENT" | "PAID" | "UNPAID" | "CANCELLED" | string;
    pdfUrl?: string | null;
    invoiceNumber?: string;
};

/**
 * Creates a new invoice for a booking.
 *
 * @param bookingId - UUID of the booking to invoice.
 * @returns The newly created {@link InvoiceDTO}.
 */
export async function createInvoice(bookingId: string): Promise<InvoiceDTO> {
    const { data } = await api.post<InvoiceDTO>(`/api/invoices/${bookingId}`);
    return data;
}

/**
 * Returns the existing invoice for a booking, creating one if none exists.
 * Performs a GET first; falls back to POST on any error (e.g. 404).
 *
 * @param bookingId - UUID of the booking.
 * @returns The existing or newly created {@link InvoiceDTO}.
 */
export async function ensureInvoice(bookingId: string): Promise<InvoiceDTO> {
    try {
        const getRes = await api.get<InvoiceDTO>(`/api/invoices/booking/${bookingId}`);
        return getRes.data;
    } catch {
        const { data } = await api.post<InvoiceDTO>(`/api/invoices/${bookingId}`);
        return data;
    }
}

/**
 * Fetches a single invoice by its UUID.
 *
 * @param id - UUID of the invoice.
 * @returns The resolved {@link InvoiceDTO}.
 */
export async function getInvoiceById(id: string): Promise<InvoiceDTO> {
    const { data } = await api.get<InvoiceDTO>(`/api/invoices/${id}`);
    return data;
}

/**
 * Fetches the invoice associated with a specific booking.
 *
 * @param bookingId - UUID of the booking.
 * @returns The associated {@link InvoiceDTO}.
 */
export async function getInvoiceByBookingId(bookingId: string): Promise<InvoiceDTO> {
    const { data } = await api.get<InvoiceDTO>(`/api/invoices/booking/${bookingId}`);
    return data;
}

/**
 * Fetches an invoice by its human-readable invoice number.
 *
 * @param invoiceNumber - The invoice number string (e.g. "INV-2024-001").
 * @returns The matching {@link InvoiceDTO}.
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceDTO> {
    const { data } = await api.get<InvoiceDTO>(`/api/invoices/number/${invoiceNumber}`);
    return data;
}

/**
 * Partially updates an invoice's fields.
 *
 * @param id      - UUID of the invoice to update.
 * @param payload - Fields to update (partial {@link InvoiceDTO}).
 * @returns The updated {@link InvoiceDTO}.
 */
export async function updateInvoice(id: string, payload: Partial<InvoiceDTO>): Promise<InvoiceDTO> {
    const { data } = await api.put<InvoiceDTO>(`/api/invoices/${id}`, payload);
    return data;
}

/**
 * Marks an invoice as {@code PAID}.
 *
 * @param id - UUID of the invoice.
 * @returns The updated {@link InvoiceDTO}.
 */
export async function markInvoicePaid(id: string): Promise<InvoiceDTO> {
    const { data } = await api.put<InvoiceDTO>(`/api/invoices/${id}/paid`);
    return data;
}

/**
 * Marks an invoice as {@code UNPAID}.
 *
 * @param id - UUID of the invoice.
 * @returns The updated {@link InvoiceDTO}.
 */
export async function markInvoiceUnpaid(id: string): Promise<InvoiceDTO> {
    const { data } = await api.put<InvoiceDTO>(`/api/invoices/${id}/unpaid`);
    return data;
}

/**
 * Marks an invoice as {@code CANCELLED}.
 *
 * @param id - UUID of the invoice.
 * @returns The updated {@link InvoiceDTO}.
 */
export async function markInvoiceCancelled(id: string): Promise<InvoiceDTO> {
    const { data } = await api.put<InvoiceDTO>(`/api/invoices/${id}/cancelled`);
    return data;
}

/**
 * Permanently deletes an invoice.
 *
 * @param id - UUID of the invoice to delete.
 */
export async function deleteInvoice(id: string): Promise<void> {
    await api.delete(`/api/invoices/${id}`);
}
