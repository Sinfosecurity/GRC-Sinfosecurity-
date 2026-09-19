-- AlterTable
ALTER TABLE "EvidenceLink" ADD COLUMN "intakeRequestId" TEXT;
ALTER TABLE "EvidenceLink" ADD COLUMN "intakeInformationRequestId" TEXT;

-- CreateIndex
CREATE INDEX "EvidenceLink_intakeRequestId_idx" ON "EvidenceLink"("intakeRequestId");
CREATE INDEX "EvidenceLink_intakeInformationRequestId_idx" ON "EvidenceLink"("intakeInformationRequestId");

-- AddForeignKey
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_intakeRequestId_fkey" FOREIGN KEY ("intakeRequestId") REFERENCES "IntakeRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenceLink" ADD CONSTRAINT "EvidenceLink_intakeInformationRequestId_fkey" FOREIGN KEY ("intakeInformationRequestId") REFERENCES "IntakeInformationRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
