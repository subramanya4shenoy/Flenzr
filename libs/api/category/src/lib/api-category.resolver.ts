import { Query, Resolver } from "@nestjs/graphql";
import { CategoryModel } from "./models/category.model";
import { CategoryService } from "./service/category.service";

@Resolver()
export class CategoryResolver {

    constructor(private categoryService:CategoryService){}
        
    @Query(() => [CategoryModel])
    async getAllCategory(): Promise<CategoryModel[]> {
        return await this.categoryService.getAllCategories();
    }
}