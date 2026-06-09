-- Store provider metadata (attendees, organiser, times, web_url, …) per transcript.
ALTER TABLE "meeting_transcripts" ADD COLUMN "metadata" JSONB;
