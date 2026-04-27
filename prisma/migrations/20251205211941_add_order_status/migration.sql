-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "comment" TEXT,
    "payment" TEXT NOT NULL,
    "delivery" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "totalPrice" INTEGER NOT NULL
);
INSERT INTO "new_Order" ("address", "comment", "createdAt", "delivery", "id", "name", "payment", "phone", "totalPrice") SELECT "address", "comment", "createdAt", "delivery", "id", "name", "payment", "phone", "totalPrice" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
