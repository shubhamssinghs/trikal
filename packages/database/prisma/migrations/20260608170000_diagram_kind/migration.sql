-- Diagram type (architecture | flowchart | dfd | erd | mindmap | sequence | gantt | state)
ALTER TABLE "diagrams" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'architecture';
