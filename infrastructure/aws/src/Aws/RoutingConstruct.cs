using Amazon.CDK;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.Apigatewayv2.Alpha;
using Amazon.CDK.AWS.Lambda;
using Amazon.CDK.AWS.Amplify.Alpha;
using Constructs;
using System.Collections.Generic;

namespace Aws
{
    public class RoutingConstruct : Construct
    {
        public Distribution Distribution { get; }

        public RoutingConstruct(Construct scope, string id, HttpApi httpApi, FunctionUrl functionUrl, Amazon.CDK.AWS.Amplify.Alpha.App amplifyApp) : base(scope, id)
        {
            Distribution = new Distribution(this, "WfsDistribution", new DistributionProps
            {
                DefaultBehavior = new BehaviorOptions
                {
                    Origin = new HttpOrigin($"{amplifyApp.DefaultDomain}"),
                    ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    AllowedMethods = AllowedMethods.ALLOW_ALL,
                    CachePolicy = CachePolicy.CACHING_DISABLED 
                },
                AdditionalBehaviors = new Dictionary<string, IBehaviorOptions>
                {
                    ["/api/*"] = new BehaviorOptions
                    {
                        Origin = new HttpOrigin($"{httpApi.HttpApiId}.execute-api.{Stack.Of(this).Region}.amazonaws.com"),
                        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        AllowedMethods = AllowedMethods.ALLOW_ALL,
                        CachePolicy = CachePolicy.CACHING_DISABLED,
                        OriginRequestPolicy = OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
                    },
                    ["/api/stream"] = new BehaviorOptions
                    {
                        Origin = new HttpOrigin(functionUrl.Url.Replace("https://", "").Replace("/", "")),
                        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                        AllowedMethods = AllowedMethods.ALLOW_ALL,
                        CachePolicy = CachePolicy.CACHING_DISABLED,
                        OriginRequestPolicy = OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER
                    }
                }
            });

            new CfnOutput(this, "CloudFrontUrl", new CfnOutputProps { Value = Distribution.DistributionDomainName });
        }
    }
}
