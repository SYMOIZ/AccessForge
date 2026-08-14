#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { AccessForgeStack } from "../lib/accessforge-stack";

const app = new cdk.App();
new AccessForgeStack(app, "AccessForgeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || "us-east-1",
  },
  description: "AccessForge visual AWS access-control playground",
});
