-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "uploadDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL,
    "summaryJson" TEXT NOT NULL,
    "rulesUsedJson" TEXT NOT NULL,
    CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcessedRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "analysisId" INTEGER NOT NULL,
    "rowData" TEXT NOT NULL,
    "employee" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    CONSTRAINT "ProcessedRecord_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessRule" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestedAction" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IncidenceCount" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "analysisId" INTEGER NOT NULL,
    "employee" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "suggestedMeasure" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Analysis_userId_idx" ON "Analysis"("userId");

-- CreateIndex
CREATE INDEX "ProcessedRecord_analysisId_idx" ON "ProcessedRecord"("analysisId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessRule_name_key" ON "BusinessRule"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IncidenceCount_analysisId_employee_key" ON "IncidenceCount"("analysisId", "employee");
