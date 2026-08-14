import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as amplify from "aws-cdk-lib/aws-amplify";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";

export class AccessForgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bedrockModelId =
      this.node.tryGetContext("bedrockModelId") ||
      process.env.BEDROCK_MODEL_ID ||
      "amazon.nova-lite-v1:0";

    const table = new dynamodb.Table(this, "Scenarios", {
      tableName: "AccessForgeScenarios",
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: false },
    });

    const exportsBucket = new s3.Bucket(this, "PolicyExports", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(7) }],
    });

    const autoConfirm = new lambda.Function(this, "AutoConfirm", {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: "index.handler",
      timeout: cdk.Duration.seconds(5),
      memorySize: 128,
      description: "Demo-only pre-signup auto-confirm. Enable email verification for production.",
      logRetention: logs.RetentionDays.ONE_WEEK,
      code: lambda.Code.fromInline(
        [
          "def handler(event, context):",
          "    event['response']['autoConfirmUser'] = True",
          "    event['response']['autoVerifyEmail'] = True",
          "    return event",
          "",
        ].join("\n")
      ),
    });

    const userPool = new cognito.UserPool(this, "Users", {
      userPoolName: "accessforge-users",
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, autoConfirm);

    const userPoolClient = userPool.addClient("WebClient", {
      userPoolClientName: "accessforge-web",
      generateSecret: false,
      authFlows: {
        userSrp: true,
        userPassword: true,
      },
      preventUserExistenceErrors: true,
      idTokenValidity: cdk.Duration.hours(12),
      accessTokenValidity: cdk.Duration.hours(12),
    });

    const apiLogGroup = new logs.LogGroup(this, "ApiLogs", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const apiFn = new lambda.Function(this, "ApiFunction", {
      runtime: lambda.Runtime.PYTHON_3_13,
      handler: "handler.lambda_handler",
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      description: "AccessForge API: policy, simulate, analyze, advisor, scenarios",
      code: lambda.Code.fromAsset(path.join(__dirname, "../../backend/src")),
      environment: {
        SCENARIOS_TABLE: table.tableName,
        EXPORTS_BUCKET: exportsBucket.bucketName,
        BEDROCK_MODEL_ID: bedrockModelId,
        CORS_ORIGIN: "*",
      },
      logGroup: apiLogGroup,
    });

    table.grantReadWriteData(apiFn);
    exportsBucket.grantPut(apiFn);
    exportsBucket.grantRead(apiFn);

    apiFn.addToRolePolicy(
      new iam.PolicyStatement({
        sid: "BedrockInvokeConfiguredModel",
        effect: iam.Effect.ALLOW,
        actions: ["bedrock:InvokeModel"],
        resources: [
          `arn:aws:bedrock:${this.region}::foundation-model/${bedrockModelId}`,
          `arn:aws:bedrock:${this.region}:${this.account}:inference-profile/*`,
          `arn:aws:bedrock:${this.region}:${this.account}:foundation-model/${bedrockModelId}`,
        ],
      })
    );

    const authorizer = new HttpJwtAuthorizer("CognitoJwt", userPool.userPoolProviderUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });

    const httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: "accessforge-api",
      description: "AccessForge playground API",
      corsPreflight: {
        allowHeaders: ["Content-Type", "Authorization"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.PUT,
          apigwv2.CorsHttpMethod.DELETE,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
      },
    });

    const integration = new HttpLambdaIntegration("ApiIntegration", apiFn);

    httpApi.addRoutes({
      path: "/health",
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });
    httpApi.addRoutes({
      path: "/catalog",
      methods: [apigwv2.HttpMethod.GET],
      integration,
    });

    const protectedPaths: Array<[string, apigwv2.HttpMethod[]]> = [
      ["/dashboard", [apigwv2.HttpMethod.GET]],
      ["/scenarios", [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST]],
      ["/scenarios/{id}", [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.PUT, apigwv2.HttpMethod.DELETE]],
      ["/simulate", [apigwv2.HttpMethod.POST]],
      ["/analyze", [apigwv2.HttpMethod.POST]],
      ["/ai-advisor", [apigwv2.HttpMethod.POST]],
      ["/generate-policy", [apigwv2.HttpMethod.POST]],
      ["/export-policy", [apigwv2.HttpMethod.POST]],
    ];

    for (const [routePath, methods] of protectedPaths) {
      httpApi.addRoutes({
        path: routePath,
        methods,
        integration,
        authorizer,
      });
    }

    new logs.MetricFilter(this, "ApiErrorMetric", {
      logGroup: apiLogGroup,
      metricNamespace: "AccessForge",
      metricName: "ApiErrors",
      filterPattern: logs.FilterPattern.anyTerm("api_unhandled_error", "aws_client_error", "bedrock_invoke_failure"),
      metricValue: "1",
    });

    const amplifyApp = new amplify.CfnApp(this, "AmplifyHost", {
      name: "accessforge",
      description: "AccessForge frontend hosting",
      platform: "WEB",
      customRules: [
        {
          source:
            "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>",
          target: "/index.html",
          status: "200",
        },
      ],
    });

    new amplify.CfnBranch(this, "AmplifyMain", {
      appId: amplifyApp.attrAppId,
      branchName: "main",
      stage: "PRODUCTION",
      enableAutoBuild: false,
    });

    new cdk.CfnOutput(this, "Region", { value: this.region });
    new cdk.CfnOutput(this, "ApiUrl", { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, "UserPoolId", { value: userPool.userPoolId });
    new cdk.CfnOutput(this, "UserPoolClientId", { value: userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, "BedrockModelId", { value: bedrockModelId });
    new cdk.CfnOutput(this, "ScenariosTable", { value: table.tableName });
    new cdk.CfnOutput(this, "ExportsBucket", { value: exportsBucket.bucketName });
    new cdk.CfnOutput(this, "AmplifyAppId", { value: amplifyApp.attrAppId });
    new cdk.CfnOutput(this, "AmplifyUrl", {
      value: `https://main.${amplifyApp.attrAppId}.amplifyapp.com`,
    });
  }
}
