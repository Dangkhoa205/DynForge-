package com.dynforge.be.service;

import com.dynforge.be.exception.BadRequestException;
import com.dynforge.be.model.entity.Booking;
import com.dynforge.be.model.entity.EscrowTransaction;
import com.dynforge.be.model.enums.BookingStatus;
import com.dynforge.be.model.enums.EscrowStatus;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collection;

/**
 * Atomic ("compare-and-set") status changes for bookings and escrow records.
 *
 * <p>Each change only succeeds if the document is still in one of the expected states, in a single
 * MongoDB operation. When two requests race (e.g. the mentee confirms while the hourly scheduler
 * auto-confirms), exactly one wins and the other gets {@code null} / an error, so money can never be
 * released or refunded twice.
 */
@Service
@RequiredArgsConstructor
public class BookingTransitions {

    private final MongoTemplate mongoTemplate;

    /**
     * Moves a booking from any of {@code from} to {@code to}, applying {@code extra} in the same write.
     *
     * @return the updated booking, or {@code null} if it was no longer in one of the expected states
     */
    public Booking transition(String bookingId, Collection<BookingStatus> from, BookingStatus to, Update extra) {
        Query query = Query.query(Criteria.where("id").is(bookingId).and("status").in(from));
        Update update = extra != null ? extra : new Update();
        update.set("status", to);
        return mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true), Booking.class);
    }

    /** Same as {@link #transition} but throws a readable error instead of returning null. */
    public Booking transitionOrFail(String bookingId, Collection<BookingStatus> from, BookingStatus to, Update extra) {
        Booking updated = transition(bookingId, from, to, extra);
        if (updated == null) {
            Booking current = mongoTemplate.findById(bookingId, Booking.class);
            String now = current == null ? "missing" : String.valueOf(current.getStatus());
            throw new BadRequestException("Booking must be in " + from + " for this action (was " + now + ")");
        }
        return updated;
    }

    /**
     * Marks the booking's escrow as settled (RELEASED or REFUNDED) only if it is still HELD.
     *
     * @return the settled escrow, or {@code null} if it had already been settled
     */
    public EscrowTransaction settleEscrow(String bookingId, EscrowStatus outcome) {
        Query query = Query.query(Criteria.where("bookingId").is(new ObjectId(bookingId))
                .and("status").is(EscrowStatus.HELD));
        Update update = new Update().set("status", outcome).set("releasedAt", Instant.now());
        return mongoTemplate.findAndModify(query, update, FindAndModifyOptions.options().returnNew(true),
                EscrowTransaction.class);
    }

    /** Writes the escrow reference onto a booking without touching any other field. */
    public void linkEscrow(String bookingId, String escrowId) {
        mongoTemplate.updateFirst(Query.query(Criteria.where("id").is(bookingId)),
                new Update().set("escrowTxnId", new ObjectId(escrowId)), Booking.class);
    }
}
