import { Query, Resolver } from "@nestjs/graphql";
import { CatgoryModel } from "./models/category.model";
import { CategoryService } from "./service/category.service";

@Resolver()
export class CategoryResolver {

    constructor(private categoryService:CategoryService){}
        
    @Query(() => [CatgoryModel])
    async getAllCategory(): Promise<CatgoryModel[]> {
        return await this.categoryService.getAllCategories();
    }
}