import { Module } from '@nestjs/common';
import { CategoryResolver } from './api-category.resolver';
import { CategoryService } from './service/category.service';

@Module({
	controllers: [],
	providers: [CategoryResolver, CategoryService],
	exports: [],
})
export class ApiCategoryModule {}
