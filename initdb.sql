CREATE DATABASE "my-finance";

\c "my-finance";

CREATE TABLE "migrations" (
    "id" SERIAL PRIMARY KEY,
    "filename" CHARACTER VARYING(1024) NOT NULL,
    "timestamp" TIMESTAMP WITHOUT TIME ZONE NOT NULL
);
