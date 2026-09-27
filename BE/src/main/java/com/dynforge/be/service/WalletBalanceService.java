package com.dynforge.be.service;

import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.model.entity.User;
import com.mongodb.client.result.UpdateResult;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Service;

/**
 * The only place that changes {@code User.walletBalance}.
 *
 * <p>Every change is a single atomic MongoDB update ({@code $inc}), so two concurrent requests can
 * never both spend the same money. The old code read the balance, changed it in Java and saved the
 * whole user document back, which let two parallel withdrawals both succeed on one balance.
 */
@Service
@RequiredArgsConstructor
public class WalletBalanceService {

    private static final String BALANCE = "walletBalance";

    private final MongoTemplate mongoTemplate;

    /**
     * Subtracts {@code amount} only if the current balance covers it.
     *
     * @return true when the money was taken, false when the balance was insufficient
     */
    public boolean debit(String userId, long amount) {
        requirePositive(amount);
        Query query = Query.query(Criteria.where("id").is(userId).and(BALANCE).gte(amount));
        UpdateResult result = mongoTemplate.updateFirst(query, new Update().inc(BALANCE, -amount), User.class);
        return result.getModifiedCount() == 1;
    }

    /** Adds {@code amount} to the balance. */
    public void credit(String userId, long amount) {
        requirePositive(amount);
        Query query = Query.query(Criteria.where("id").is(userId));
        UpdateResult result = mongoTemplate.updateFirst(query, new Update().inc(BALANCE, amount), User.class);
        if (result.getMatchedCount() == 0) {
            throw new ResourceNotFoundException("User not found: " + userId);
        }
    }

    /** Overwrites the balance. Only for seeding demo data. */
    public void setBalance(String userId, long amount) {
        Query query = Query.query(Criteria.where("id").is(userId));
        mongoTemplate.updateFirst(query, new Update().set(BALANCE, amount), User.class);
    }

    /** Reads the live balance straight from the database. */
    public long balanceOf(String userId) {
        User user = mongoTemplate.findById(userId, User.class);
        return user == null ? 0 : user.getWalletBalance();
    }

    private static void requirePositive(long amount) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Amount must be positive, was " + amount);
        }
    }
}
