package com.dynforge.be.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.MongoDatabaseFactory;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.mongodb.gridfs.GridFsTemplate;

/**
 * GridFS bucket for mentor verification documents (transcripts, student cards…). Files live in the
 * same MongoDB database, so they survive redeploys/restarts of the API server.
 */
@Configuration
public class GridFsConfig {

    public static final String DOCUMENT_BUCKET = "verification_documents";

    @Bean
    public GridFsTemplate documentGridFsTemplate(MongoDatabaseFactory factory, MongoConverter converter) {
        return new GridFsTemplate(factory, converter, DOCUMENT_BUCKET);
    }
}
