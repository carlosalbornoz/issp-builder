-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "logoPath" TEXT,
    "websiteUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IsspDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "amendmentNumber" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IsspDocument_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "IsspDocument_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Part1Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isspDocId" TEXT NOT NULL,
    "legalBasis" TEXT NOT NULL DEFAULT '',
    "mandateFunction" TEXT NOT NULL DEFAULT '',
    "visionStatement" TEXT NOT NULL DEFAULT '',
    "missionStatement" TEXT NOT NULL DEFAULT '',
    "orgOutcomes" TEXT NOT NULL DEFAULT '[]',
    "cioName" TEXT NOT NULL DEFAULT '',
    "cioPosition" TEXT NOT NULL DEFAULT '',
    "cioUnit" TEXT NOT NULL DEFAULT '',
    "cioEmail" TEXT NOT NULL DEFAULT '',
    "cioContact" TEXT NOT NULL DEFAULT '',
    "focalName" TEXT NOT NULL DEFAULT '',
    "focalPosition" TEXT NOT NULL DEFAULT '',
    "focalUnit" TEXT NOT NULL DEFAULT '',
    "focalEmail" TEXT NOT NULL DEFAULT '',
    "focalContact" TEXT NOT NULL DEFAULT '',
    "humanCapital" TEXT NOT NULL DEFAULT '{}',
    "stakeholders" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Part1Profile_isspDocId_fkey" FOREIGN KEY ("isspDocId") REFERENCES "IsspDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Part2Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isspDocId" TEXT NOT NULL,
    "strategicConcerns" TEXT NOT NULL DEFAULT '[]',
    "networkDiagramPath" TEXT,
    "networkDescription" TEXT NOT NULL DEFAULT '',
    "cybersecurityControls" TEXT NOT NULL DEFAULT '{}',
    "informationSystems" TEXT NOT NULL DEFAULT '[]',
    "egpChecklist" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Part2Assessment_isspDocId_fkey" FOREIGN KEY ("isspDocId") REFERENCES "IsspDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Part3Strategy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isspDocId" TEXT NOT NULL,
    "proposedNetworkDiagram" TEXT,
    "proposedNetworkDesc" TEXT NOT NULL DEFAULT '',
    "proposedCybersecControls" TEXT NOT NULL DEFAULT '{}',
    "enterpriseArchDiagram" TEXT,
    "proposedHumanCapital" TEXT NOT NULL DEFAULT '[]',
    "proposedSystems" TEXT NOT NULL DEFAULT '[]',
    "internalProjects" TEXT NOT NULL DEFAULT '[]',
    "crossAgencyProjects" TEXT NOT NULL DEFAULT '[]',
    "performanceFramework" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Part3Strategy_isspDocId_fkey" FOREIGN KEY ("isspDocId") REFERENCES "IsspDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Part4Resources" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isspDocId" TEXT NOT NULL,
    "year1" TEXT NOT NULL DEFAULT '{}',
    "year2" TEXT NOT NULL DEFAULT '{}',
    "year3" TEXT NOT NULL DEFAULT '{}',
    CONSTRAINT "Part4Resources_isspDocId_fkey" FOREIGN KEY ("isspDocId") REFERENCES "IsspDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Agency_acronym_key" ON "Agency"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_agencyId_idx" ON "User"("agencyId");

-- CreateIndex
CREATE INDEX "IsspDocument_agencyId_idx" ON "IsspDocument"("agencyId");

-- CreateIndex
CREATE INDEX "IsspDocument_createdBy_idx" ON "IsspDocument"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Part1Profile_isspDocId_key" ON "Part1Profile"("isspDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Part2Assessment_isspDocId_key" ON "Part2Assessment"("isspDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Part3Strategy_isspDocId_key" ON "Part3Strategy"("isspDocId");

-- CreateIndex
CREATE UNIQUE INDEX "Part4Resources_isspDocId_key" ON "Part4Resources"("isspDocId");
