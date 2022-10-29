-- CreateTable
CREATE TABLE "user_info" (
    "user_id" INTEGER NOT NULL,
    "about" VARCHAR(255) NOT NULL,
    "rating" VARCHAR(255) NOT NULL,
    "style" TEXT NOT NULL,

    CONSTRAINT "user_info_pkey" PRIMARY KEY ("user_id")
);
