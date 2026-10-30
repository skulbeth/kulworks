-- "Rejected" = we turned the job down, kept apart from "Lost" (the client walked).
ALTER TYPE "ProjectStage" ADD VALUE 'REJECTED';
ALTER TYPE "SubmissionStatus" ADD VALUE 'REJECTED';
