-- CreateTable
CREATE TABLE "Topology" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SvgElement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "topologyId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "props" TEXT NOT NULL,
    "x" REAL NOT NULL DEFAULT 0,
    "y" REAL NOT NULL DEFAULT 0,
    "transform" TEXT,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SvgElement_topologyId_fkey" FOREIGN KEY ("topologyId") REFERENCES "Topology" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
