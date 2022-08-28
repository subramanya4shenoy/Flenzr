import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config";
import { configuration } from "./config/configuration";
import { validationSchema } from "./config/validation";
import { GraphQLModule } from "@nestjs/graphql";
import { CoreResolver } from "./core.resolver";
import { ApolloDriver } from '@nestjs/apollo';


@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration],
			validationSchema,
		  }),
		GraphQLModule.forRoot({
			autoSchemaFile: true,
			driver: ApolloDriver,
		  })
	],
	controllers: [],
	providers: [CoreResolver],
	exports: [],
})
export class ApiCoreModule {}
