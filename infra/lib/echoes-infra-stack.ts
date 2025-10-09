import * as path from 'path';
import * as cdk from 'aws-cdk-lib'
import * as cognito from 'aws-cdk-lib/aws-cognito'
import { Duration, RemovalPolicy, CfnOutput, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { HttpApi, CorsPreflightOptions, CorsHttpMethod, HttpMethod } from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpJwtAuthorizer } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class EchoesInfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // DynamoDB table (single-table, minimal for now)
    const table = new Table(this, 'EchoesTable', {
      tableName: 'EchoesTable',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY, // Note: dev-only; consider RETAIN for prod
      pointInTimeRecovery: false,
    });

    // Create Cognito User Pool
    const userPool = new cognito.UserPool(this, 'EchoesUserPool', {
      userPoolName: 'echoes-of-pharloom',

      signInAliases: {
        email: true,
        phone: true,
        username: true,
      },

      selfSignUpEnabled: true,

      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },

      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },

      accountRecovery: cognito.AccountRecovery.PHONE_AND_EMAIL,

      autoVerify: {
        email: true,
      },

      // need to change to RETAIN later for prod
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'EchoesUserPoolClient', {
      userPool,
      userPoolClientName: 'echoes-react-client',
      
      authFlows: {
        userSrp: true,
        userPassword: false,
        adminUserPassword: false,
      },
      
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
        ],
        callbackUrls: [
          'http://localhost:3000/auth/callback', // Development
          // Add production URLs later: 'https://yourdomain.com/auth/callback'
        ],
        logoutUrls: [
          'http://localhost:3000/', // Development
          // Add production URLs later: 'https://yourdomain.com/'
        ],
      },

      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      refreshTokenValidity: cdk.Duration.days(30),
      
      preventUserExistenceErrors: true,
    });

    // Create JWT Authorizer for HTTP API v2
    const jwtAuthorizer = new HttpJwtAuthorizer('EchoesJwtAuthorizer', `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });

    // Lambda functions
    const listAreasFn = new NodejsFunction(this, 'ListAreasFn', {
      entry: path.join(__dirname, '../../services/api/listAreas.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const getHomeFn = new NodejsFunction(this, 'GetHomeFn', {
      entry: path.join(__dirname, '../../services/api/getHome.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const createSessionFn = new NodejsFunction(this, 'CreateSessionFn', {
      entry: path.join(__dirname, '../../services/api/createSession.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.ONE_WEEK,
    });

    const appendEventFn = new NodejsFunction(this, 'AppendEventFn', {
      entry: path.join(__dirname, '../../services/api/appendEvent.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        TABLE_NAME: table.tableName,
      },
      logRetention: RetentionDays.ONE_WEEK,
    });

    table.grantReadData(listAreasFn);
    table.grantReadData(getHomeFn);
    table.grantReadWriteData(createSessionFn);
    table.grantReadWriteData(appendEventFn);

    // S3 bucket for profile photos
    const photosBucket = new s3.Bucket(this, 'ProfilePhotos', {
      removalPolicy: RemovalPolicy.DESTROY, // dev only
      autoDeleteObjects: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['*'], // tighten for prod
          allowedHeaders: ['*'],
        },
      ],
    });

    // Upload URL function
    const getUploadUrlFn = new NodejsFunction(this, 'GetUploadUrlFn', {
      entry: path.join(__dirname, '../../services/api/getUploadUrl.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(5),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        PHOTOS_BUCKET: photosBucket.bucketName,
      },
      logRetention: RetentionDays.ONE_WEEK,
    });
    photosBucket.grantPut(getUploadUrlFn);

    // Feedback (Resend) function
    const feedbackFn = new NodejsFunction(this, 'FeedbackFn', {
      entry: path.join(__dirname, '../../services/api/feedback.ts'),
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(7),
      bundling: { minify: true, target: 'es2020' },
      environment: {
        RESEND_API_KEY: process.env.RESEND_API_KEY || '',
        CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL || 'hh727w@gmail.com',
        CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL || 'Echoes of Pharloom <onboarding@resend.dev>',
      },
      logRetention: RetentionDays.ONE_WEEK,
    });

    // HTTP API with CORS for local dev
    const httpApi = new HttpApi(this, 'EchoesHttpApi', {
      corsPreflight: {
        allowHeaders: ['*'],
        allowMethods: [
          CorsHttpMethod.GET,
          CorsHttpMethod.POST,
          CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ['*'],
        maxAge: Duration.days(10),
      } as CorsPreflightOptions,
    });

    // Public routes (no authentication required)
    httpApi.addRoutes({
      path: '/areas',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('AreasIntegration', listAreasFn),
    });

    // Protected routes (authentication required)
    httpApi.addRoutes({
      path: '/home',
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration('HomeIntegration', getHomeFn),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/sessions',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('CreateSessionIntegration', createSessionFn),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: '/sessions/{sessionId}/events',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('AppendEventIntegration', appendEventFn),
      authorizer: jwtAuthorizer,
    });

    // Upload URL (protected)
    httpApi.addRoutes({
      path: '/profile/photo/uploadurl',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('UploadUrlIntegration', getUploadUrlFn),
      authorizer: jwtAuthorizer,
    });

    // Feedback (public)
    httpApi.addRoutes({
      path: '/feedback',
      methods: [HttpMethod.POST],
      integration: new HttpLambdaIntegration('FeedbackIntegration', feedbackFn),
    });

    // Stack outputs
    new CfnOutput(this, 'ApiUrl', { 
      value: httpApi.apiEndpoint,
      description: 'HTTP API endpoint'
    });

    new CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
    });

    new CfnOutput(this, 'UserPoolDomain', {
      value: `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`,
      description: 'Cognito User Pool Domain for JWT validation',
    });
  }
}