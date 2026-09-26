package com.dynforge.be.model.entity;

import com.dynforge.be.model.enums.UniversityStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document("universities")
public class University {

    @Id
    private String id;

    /** Upper-case slug, unique: "FPTU-HCM", "UTH". */
    @Indexed(unique = true)
    private String code;

    /** Full display name. */
    private String name;

    /** Short display name, e.g. "FPTU HCM". */
    private String shortName;

    /** Search aliases, e.g. ["ĐH FPT", "FPT University", "FPTU"]. */
    private List<String> aliases;

    /** Verified email domains, e.g. ["fpt.edu.vn"] — used from phase 2. */
    private List<String> emailDomains;

    private String logoUrl;

    @Builder.Default
    private UniversityStatus status = UniversityStatus.WAITLIST;

    private Instant createdAt;
}
