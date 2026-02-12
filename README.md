# About

**gmail-ingest-svc** is a gmail ingestion agent designed only with readonly permissions. This service ingests Gmail API history deltas, messages, attachments, threads and normalizes the data into more predictable objects that can be consumed by downstream services.

# End-to-End Workflow 
ingestion -> normalization -> storing (TBD) (possible S3 or Postgres Schema)

# Interface
- post /ingest
- get /events/latest
- get /health
