using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.EFS;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Apigatewayv2.Alpha;
using Amazon.CDK.AWS.Apigatewayv2.Integrations.Alpha;
using Amazon.CDK.AWS.RDS;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.AWS.Ecr.Assets;
using Constructs;
using System.Collections.Generic;

namespace Aws
{
    public class BackendConstruct : Construct
    {
        public IFunction LambdaFunction { get; }
        public FunctionUrl FunctionUrl { get; }
        public HttpApi HttpApi { get; }
        public string ConfiguredPostgresConnectionString { get; }

        public BackendConstruct(
            Construct scope,
            string id,
            IVpc vpc,
            Amazon.CDK.AWS.EFS.FileSystem fileSystem,
            AccessPoint accessPoint,
            IDatabaseInstance database,
            string databaseName,
            string username,
            string password) : base(scope, id)
        {
            // Extract configuration from CDK Context (passed from GitHub Actions)
            var imageTag = (string)this.Node.TryGetContext("imageTag") ?? "v0.0.0";
            var geminiApiKey = (string)this.Node.TryGetContext("geminiApiKey") ?? "none";
            var geminiModelId = (string)this.Node.TryGetContext("geminiModelId") ?? "gemini-3-flash-preview";
            var geminiModelIdHero = (string)this.Node.TryGetContext("geminiModelIdHero") ?? "models/gemini-3-pro-image-preview";
            var geminiEndpoint = (string)this.Node.TryGetContext("geminiEndpoint") ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
            var embeddingModelId = (string)this.Node.TryGetContext("embeddingModelId") ?? "gemini-embedding-2";
            var hearthSecret = (string)this.Node.TryGetContext("hearthSecret") ?? "Swipe-Match-Cook";
            var elevatedActionsPin = (string)this.Node.TryGetContext("elevatedActionsPin") ?? "0000";
            var importTargetLanguage = (string)this.Node.TryGetContext("importTargetLanguage") ?? "NONE";
            var demoMode = (string)this.Node.TryGetContext("demoMode") ?? "true";
            var demoRestoreCron = (string)this.Node.TryGetContext("demoRestoreCron") ?? "0 3 * * *";
            var dreamingCron = (string)this.Node.TryGetContext("dreamingCron") ?? "0 3 * * *";
            var allowedOrigins = (string)this.Node.TryGetContext("allowedOrigins") ?? "*";
            var domainName = (string)this.Node.TryGetContext("domainName") ?? "wfs.srvrlss.dev";
            var postgresConnectionString =
                $"Host={database.DbInstanceEndpointAddress};Port=5432;Database={databaseName};Username={username};Password={password}";
            ConfiguredPostgresConnectionString = postgresConnectionString;

            LambdaFunction = new DockerImageFunction(this, "WfsApiLambda", new DockerImageFunctionProps
            {
                Code = DockerImageCode.FromImageAsset("../../api", new AssetImageCodeProps
                {
                    Target = "demo"
                }), 
                MemorySize = 1024,
                Timeout = Duration.Seconds(30),
                Vpc = vpc,
                VpcSubnets = new SubnetSelection { SubnetType = SubnetType.PUBLIC },
                Filesystem = Amazon.CDK.AWS.Lambda.FileSystem.FromEfsAccessPoint(accessPoint, "/mnt/data"),
                Environment = new Dictionary<string, string>
                {
                    // Storage (EFS Mount)
                    { "DATA_ROOT", "/mnt/data" },
                    { "RECIPES_ROOT", "/mnt/data/recipes" },
                    { "WORKFLOWS_ROOT", "/mnt/data/workflows" },

                    // Database
                    { "POSTGRES_CONNECTION_STRING", postgresConnectionString },
                    
                    // Runtime
                    { "ASPNETCORE_ENVIRONMENT", "Production" },
                    { "AWS_LAMBDA_ADAPTER_PORT", "9001" },
                    { "APP_VERSION", imageTag },

                    // AI Configuration
                    { "GEMINI_API_KEY", geminiApiKey },
                    { "GEMINI_MODEL_ID", geminiModelId },
                    { "GEMINI_MODEL_ID_HERO", geminiModelIdHero },
                    { "GEMINI_ENDPOINT", geminiEndpoint },
                    { "EMBEDDING_MODEL_ID", embeddingModelId },
                    { "IMPORT_TARGET_LANGUAGE", importTargetLanguage },

                    // Security
                    { "HEARTH_SECRET", hearthSecret },
                    { "ELEVATED_ACTIONS_PIN", elevatedActionsPin },

                    // Demo & Maintenance
                    { "DEMO_MODE", demoMode },
                    { "DEMO_RESTORE_CRON_UTC", demoRestoreCron },
                    { "DREAMING_CRON_UTC", dreamingCron },

                    // Networking
                    { "DOMAIN_NAME", domainName },
                    { "CORS__ALLOWED_ORIGINS", allowedOrigins }
                }
            });

            fileSystem.Connections.AllowDefaultPortFrom(LambdaFunction);

            FunctionUrl = LambdaFunction.AddFunctionUrl(new FunctionUrlOptions
            {
                AuthType = FunctionUrlAuthType.NONE,
                InvokeMode = InvokeMode.RESPONSE_STREAM
            });

            HttpApi = new HttpApi(this, "WfsHttpApi", new HttpApiProps
            {
                ApiName = "WhatsForSupperApi",
                DefaultIntegration = new HttpLambdaIntegration("WfsLambdaIntegration", LambdaFunction),
                CorsPreflight = new CorsPreflightOptions
                {
                    AllowOrigins = new[] { "*" },
                    AllowMethods = new[] { CorsHttpMethod.ANY },
                    AllowHeaders = new[] { "*" },
                    MaxAge = Duration.Days(1)
                }
            });

            new CfnOutput(this, "LambdaFunctionUrl", new CfnOutputProps { Value = FunctionUrl.Url });
            new CfnOutput(this, "ApiGatewayUrl", new CfnOutputProps { Value = HttpApi.ApiEndpoint });
            new CfnOutput(this, "ApiGatewayId", new CfnOutputProps { Value = HttpApi.HttpApiId });
        }
    }
}
