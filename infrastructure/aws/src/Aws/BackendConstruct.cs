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

        public BackendConstruct(Construct scope, string id, IVpc vpc, Amazon.CDK.AWS.EFS.FileSystem fileSystem, AccessPoint accessPoint, IDatabaseInstance database) : base(scope, id)
        {
            var imageTag = (string)this.Node.TryGetContext("imageTag") ?? "v0.0.0";

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
                    { "DATA_ROOT", "/mnt/data" },
                    { "POSTGRES_CONNECTION_STRING", $"Host={database.DbInstanceEndpointAddress};Port=5432;Database=recipe_app_db;Username=recipe_app;Password={{password}}" },
                    { "ASPNETCORE_ENVIRONMENT", "Production" },
                    { "AWS_LAMBDA_ADAPTER_PORT", "9001" },
                    { "APP_VERSION", imageTag } // Injected from Git Tag
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
                DefaultIntegration = new HttpLambdaIntegration("WfsLambdaIntegration", LambdaFunction)
            });

            new CfnOutput(this, "LambdaFunctionUrl", new CfnOutputProps { Value = FunctionUrl.Url });
            new CfnOutput(this, "ApiGatewayUrl", new CfnOutputProps { Value = HttpApi.ApiEndpoint });
        }
    }
}
