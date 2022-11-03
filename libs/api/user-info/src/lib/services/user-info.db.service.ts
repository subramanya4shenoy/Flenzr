import { PrismaService } from "@flenzr/api/auth";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UserInfoDBService {
  constructor(private readonly prisma: PrismaService) {}

  async updateUserAboutInfo(userId:number, infoTxt:string): Promise<any> {
    return await this.prisma.user_info.upsert({
      where: {
        user_id: userId,
      },
      update: {
        about: infoTxt,
      },
      create: {
        user_id: userId,
        about: infoTxt,
        rating: "0",
        style: "",
      },
    });
  }

  async getUserInfo(userId:number): Promise<any> {
    const data = await this.prisma.user_info.findFirst({
      where: {
        user_id: userId
      }
    })
    return data;
  }
}
