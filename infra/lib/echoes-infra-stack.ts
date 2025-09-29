import * as path from 'path';
import { Duration, RemovalPolicy, CfnOutput, Stack, StackProps, Fn, Names } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HttpApi, CorsPreflightOptions, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { HttpUserPoolAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';

export class EchoesInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB table (single-table, minimal for now)
    const table = new Table(this, 'EchoesTable', {
      tableName: 'EchoesTable',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // dev only; consider RETAIN for prod
      pointInTimeRecovery: false,
    });

    // Lambdas
    const listAreasFn = new NodejsFunction(this, 'ListAreasFn', {
      entry: path.join(__dirname, '../../services/api/listAreas.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: { TABLE_NAME: table.tableName },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const getHomeFn = new NodejsFunction(this, 'GetHomeFn', {
      entry: path.join(__dirname, '../../services/api/getHome.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: { TABLE_NAME: table.tableName },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const createSessionFn = new NodejsFunction(this, 'CreateSessionFn', {
      entry: path.join(__dirname, '../../services/api/createSession.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: { minify: true, target: 'es2020' },
      environment: { TABLE_NAME: table.tableName },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const appendEventFn = new NodejsFunction(this, 'AppendEventFn', {
      entry: path.join(__dirname, '../../services/api/appendEvent.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: { minify: true, target: 'es2020' },
      environment: { TABLE_NAME: table.tableName },
      logRetention: RetentionDays.ONE_WEEK,
    });

    table.grantReadData(listAreasFn);
    table.grantReadData(getHomeFn);
    table.grantReadWriteData(createSessionFn);
    table.grantReadWriteData(appendEventFn);

    // Cognito User Pool + Client (Hosted UI domain can be added later for uniqueness)
    const userPool = new cognito.UserPool(this, 'EchoesUserPool', {
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: { minLength: 8, requireLowercase: true, requireUppercase: true, requireDigits: true },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'EchoesWebClient', {
      userPool,
      generateSecret: false,
      preventUserExistenceErrors: true,
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/auth/callback'],
        logoutUrls: ['http://localhost:3000/'],
      },
    });

    // JWT authorizer for HTTP API using Cognito User Pool
    const authorizer = new HttpUserPoolAuthorizer('CognitoAuthorizer', userPool, {
      userPoolClients: [userPoolClient],
    });

    // HTTP API with CORS for local dev
    const httpApi = new HttpApi(this, 'EchoesHttpApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST, CorsHttpMethod.OPTIONS],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      } as CorsPreflightOptions,
    });

    // Public route
    httpApi.addRoutes({
      path: '/areas',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('AreasIntegration', listAreasFn),
    });

    // Protected routes (require Cognito JWT)
    httpApi.addRoutes({
      path: '/home',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('HomeIntegration', getHomeFn),
      // Keep public for now to avoid breaking existing frontend; can protect later
    });

    httpApi.addRoutes({
      path: '/sessions',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CreateSessionIntegration', createSessionFn),
      authorizer,
    });

    httpApi.addRoutes({
      path: '/sessions/{id}/events',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('AppendEventIntegration', appendEventFn),
      authorizer,
    });

    new CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new CfnOutput(this, 'UserPoolId', { value: userPool.userPoolId });
    new CfnOutput(this, 'UserPoolClientId', { value: userPoolClient.userPoolClientId });
  }
}
