import { Injectable } from '@nestjs/common';
import IUserInfo from '../interface/user-info.interface';
import { UserInfoDBService } from './user-info.db.service';

@Injectable()
export class UserInfoService {

    constructor(private readonly userIfoDbService:UserInfoDBService){}
    
    async updateUserAbout(user_id, infoTxt):Promise<IUserInfo>{
        return await this.userIfoDbService.updateUserAboutInfo(user_id, infoTxt)
    }

    async getUserInfo(user_id): Promise<IUserInfo>{
        return await this.userIfoDbService.getUserInfo(user_id);
    }
    
}