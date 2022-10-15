-- AlterTable
ALTER TABLE "user" ADD COLUMN     "dp_source" VARCHAR(255);

-- AlterTable
ALTER TABLE "user_signin_activity" ALTER COLUMN "last_login_time" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "google_yt_auth" (
    "client_id" TEXT NOT NULL,
    "access_token" VARCHAR(255) NOT NULL,
    "reresh_token" VARCHAR(255) NOT NULL,

    CONSTRAINT "google_yt_auth_pkey" PRIMARY KEY ("client_id")
);
