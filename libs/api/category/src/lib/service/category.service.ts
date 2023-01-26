import { Injectable } from "@nestjs/common";
import { CATEGORIES } from "../constant/category.constant";
import { CatgoryModel } from '../models/category.model';
@Injectable()
export class CategoryService {
    async getAllCategories(): Promise<CatgoryModel[]> {
        return await CATEGORIES;
      }
}