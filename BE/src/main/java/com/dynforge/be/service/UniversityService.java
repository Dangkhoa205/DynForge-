package com.dynforge.be.service;

import com.dynforge.be.exception.ResourceNotFoundException;
import com.dynforge.be.mapper.UniversityMapper;
import com.dynforge.be.model.dto.UniversityResponse;
import com.dynforge.be.model.entity.University;
import com.dynforge.be.model.enums.UniversityStatus;
import com.dynforge.be.repository.MentorRepository;
import com.dynforge.be.repository.UniversityRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UniversityService {

    private final UniversityRepository universityRepository;
    private final MentorRepository mentorRepository;
    private final UniversityMapper universityMapper;

    /**
     * Public listing of universities, ordered by mentor count desc. Includes
     * WAITLIST schools so mentees can discover them and join the waitlist
     * (the frontend shows a "coming soon" state for them).
     */
    public List<UniversityResponse> listPublic() {
        return universityRepository.findByStatusIn(List.of(
                        UniversityStatus.ACTIVE, UniversityStatus.LAUNCHING, UniversityStatus.WAITLIST))
                .stream()
                .map(this::toResponse)
                .sorted(Comparator.comparingLong(UniversityResponse::mentorCount).reversed())
                .toList();
    }

    public UniversityResponse getByCode(String code) {
        University university = universityRepository.findByCode(code)
                .orElseThrow(() -> new ResourceNotFoundException("University not found: " + code));
        return toResponse(university);
    }

    private UniversityResponse toResponse(University university) {
        long mentorCount = mentorRepository.countByUniversityIdAndVerifiedTrue(new ObjectId(university.getId()));
        return universityMapper.toResponse(university, mentorCount);
    }
}
