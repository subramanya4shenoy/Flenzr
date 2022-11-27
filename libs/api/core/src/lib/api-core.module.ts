import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config";
import { configuration } from "./config/configuration";
import { validationSchema } from "./config/validation";
import { GraphQLModule } from "@nestjs/graphql";
import { CoreResolver } from "./core.resolver";
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';


@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validationSchema,
		  }),
		GraphQLModule.forRoot<ApolloDriverConfig>({
			driver: ApolloDriver,
			playground: true,
			autoSchemaFile: true,
			sortSchema: true,
			persistedQueries: false
		  })
	],
	controllers: [],
	providers: [CoreResolver],
	exports: [],
})
export class ApiCoreModule {}
