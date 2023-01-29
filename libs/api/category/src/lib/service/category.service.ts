import { Injectable } from "@nestjs/common";
import { CATEGORIES } from "../constant/category.constant";
import { CategoryModel } from '../models/category.model';
@Injectable()
export class CategoryService {
  async getAllCategories(): Promise<CategoryModel[]> {
    return await CATEGORIES;
  }

  async saveCategory(category: CategoryModel): Promise<CategoryModel> {
    CATEGORIES.push(category);
    return category;
  }
}