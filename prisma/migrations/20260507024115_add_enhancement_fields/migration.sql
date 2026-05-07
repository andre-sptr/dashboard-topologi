-- AlterTable
ALTER TABLE "SvgElement" ADD COLUMN "enhancedMetadata" TEXT;
ALTER TABLE "SvgElement" ADD COLUMN "inferredNodeType" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Topology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "viewBox" TEXT DEFAULT '0 0 1000 1000',
    "assets" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "enhancedData" TEXT,
    "networkSummary" TEXT,
    "enhancedAt" DATETIME,
    "contextHint" TEXT,
    "sourceType" TEXT
);
INSERT INTO "new_Topology" ("assets", "createdAt", "id", "name", "viewBox") SELECT "assets", "createdAt", "id", "name", "viewBox" FROM "Topology";
DROP TABLE "Topology";
ALTER TABLE "new_Topology" RENAME TO "Topology";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
