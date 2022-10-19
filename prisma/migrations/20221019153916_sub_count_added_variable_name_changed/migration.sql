/*
  Warnings:

  - You are about to drop the column `hiddenSubscriberCount` on the `youtube_stats` table. All the data in the column will be lost.
  - You are about to drop the column `videoCount` on the `youtube_stats` table. All the data in the column will be lost.
  - Added the required column `hidden_subscriber_count` to the `youtube_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subscriber_count` to the `youtube_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `video_count` to the `youtube_stats` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "youtube_stats" DROP COLUMN "hiddenSubscriberCount",
DROP COLUMN "videoCount",
ADD COLUMN     "hidden_subscriber_count" BOOLEAN NOT NULL,
ADD COLUMN     "subscriber_count" TEXT NOT NULL,
ADD COLUMN     "video_count" TEXT NOT NULL;
