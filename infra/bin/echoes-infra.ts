#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EchoesInfraStack } from '../lib/echoes-infra-stack';

const app = new cdk.App();
new EchoesInfraStack(app, 'EchoesInfraStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
