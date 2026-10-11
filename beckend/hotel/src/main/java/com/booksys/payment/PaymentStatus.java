package com.booksys.payment;

public enum PaymentStatus {
    PENDING,
    PAID,
    CANCELLED,
    UNPAID,
    FAILED,
    REFUNDED,
    REFUND_REQUIRED,
    /** Booking level only: some money received, but less than the booking total. */
    PARTIALLY_PAID
}
