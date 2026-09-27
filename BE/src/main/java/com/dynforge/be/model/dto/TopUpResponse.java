package com.dynforge.be.model.dto;

/**
 * @param orderCode PayOS order code - the client passes it back to /api/wallet/payos-confirm
 */
public record TopUpResponse(
        String txnId,
        long amount,
        String paymentUrl,
        long orderCode
) {
}
