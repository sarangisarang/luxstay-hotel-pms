package com.booksys.payment.mapper;

import com.booksys.payment.dto.PaymentRequestDTO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Cardholder data must not survive the mapper. These tests pin the rule that
 * only the last four digits are kept and that the CVV and expiry date have no
 * place to be stored even if a caller sends them.
 */
class PaymentMapperCardDataTest {

    @Test
    @DisplayName("only the last four digits are kept from a card number")
    void keepsOnlyLastFour() {
        assertEquals("1881", PaymentMapper.lastFour("4111111111111881"));
    }

    @Test
    @DisplayName("spaces and dashes in the typed number do not change the result")
    void ignoresFormatting() {
        assertEquals("1881", PaymentMapper.lastFour("4111 1111 1111 1881"));
        assertEquals("1881", PaymentMapper.lastFour("4111-1111-1111-1881"));
    }

    @Test
    @DisplayName("a missing or unusable number yields no stored digits")
    void handlesMissingNumber() {
        assertNull(PaymentMapper.lastFour(null));
        assertNull(PaymentMapper.lastFour(""));
        assertNull(PaymentMapper.lastFour("12"));
    }

    @Test
    @DisplayName("the payment entity has no field able to hold a PAN, expiry or CVV")
    void entityCannotStoreCardData() {
        assertNoFieldMatching(com.booksys.payment.Payment.class);
    }

    @Test
    @DisplayName("the payment response cannot carry a PAN, expiry or CVV to a client")
    void responseCannotExposeCardData() {
        assertNoFieldMatching(com.booksys.payment.dto.PaymentResponseDTO.class);
    }

    @Test
    @DisplayName("the payment request does not accept an expiry date or CVV")
    void requestDoesNotAcceptCvv() {
        boolean hasCvvOrExpiry = Arrays.stream(PaymentRequestDTO.class.getDeclaredFields())
                .map(f -> f.getName().toLowerCase())
                .anyMatch(n -> n.contains("cvv") || n.contains("expiry"));
        assertTrue(!hasCvvOrExpiry, "PaymentRequestDTO must not accept a CVV or expiry date");
    }

    private static void assertNoFieldMatching(Class<?> type) {
        for (Field f : type.getDeclaredFields()) {
            String n = f.getName().toLowerCase();
            boolean forbidden = n.contains("cvv")
                    || n.contains("expiry")
                    || (n.contains("cardnumber"));
            assertTrue(!forbidden,
                    type.getSimpleName() + " must not declare a cardholder-data field: " + f.getName());
        }
    }
}
