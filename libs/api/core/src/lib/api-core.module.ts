import { Module } from '@nestjs/common';
import { ConfigModule } from "@nestjs/config";
import { configuration } from "./config/configuration";
import { validationSchema } from "./config/validation";
import { GraphQLModule } from "@nestjs/graphql";
import { CoreResolver } from "./core.resolver";
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageLocalDefault } from 'apollo-server-core';


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
		  })
	],
	controllers: [],
	providers: [CoreResolver],
	exports: [],
})
export class ApiCoreModule {}
