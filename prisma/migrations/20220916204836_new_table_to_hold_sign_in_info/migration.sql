-- CreateTable
CREATE TABLE "facebook" (
    "facebook_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(255),
    "followers" INTEGER,
    "trend" INTEGER,
    "created_datetime" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facebook_pkey" PRIMARY KEY ("facebook_id")
);

-- CreateTable
CREATE TABLE "instagram" (
    "instagram_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(255),
    "followers" INTEGER,
    "trend" INTEGER,
    "created_datetime" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_pkey" PRIMARY KEY ("instagram_id")
);

-- CreateTable
CREATE TABLE "linked_in" (
    "linkedin_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(255),
    "followers" INTEGER,
    "trend" INTEGER,
    "created_datetime" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "linked_in_pkey" PRIMARY KEY ("linkedin_id")
);

-- CreateTable
CREATE TABLE "user" (
    "user_id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "verified" BOOLEAN DEFAULT false,
    "source" VARCHAR(255),
    "mobile_verified" BOOLEAN DEFAULT false,
    "location" VARCHAR(255),
    "language" VARCHAR(255),
    "created_ip" VARCHAR(255),
    "display_name" VARCHAR(255),
    "device_id" VARCHAR(255),
    "name" VARCHAR(255),
    "mobile" VARCHAR(255),
    "created_datetime" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "youtube" (
    "youtube_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "display_name" VARCHAR(255),
    "followers" INTEGER,
    "trend" INTEGER,
    "created_datetime" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "youtube_pkey" PRIMARY KEY ("youtube_id")
);

-- CreateTable
CREATE TABLE "user_signin_activity" (
    "user_id" INTEGER NOT NULL,
    "last_login_time" TIMESTAMP(0) NOT NULL,
    "location" VARCHAR(255) NOT NULL,

    CONSTRAINT "user_signin_activity_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
