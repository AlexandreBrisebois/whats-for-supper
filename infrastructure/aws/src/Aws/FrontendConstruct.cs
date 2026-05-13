using Amazon.CDK.AWS.Amplify.Alpha;
using Amazon.CDK;
using Constructs;
using System.Collections.Generic;

namespace Aws
{
    public class FrontendConstruct : Construct
    {
        public Amazon.CDK.AWS.Amplify.Alpha.App AmplifyApp { get; }

        public FrontendConstruct(Construct scope, string id) : base(scope, id)
        {
            AmplifyApp = new Amazon.CDK.AWS.Amplify.Alpha.App(this, "WfsPwa", new Amazon.CDK.AWS.Amplify.Alpha.AppProps
            {
                SourceCodeProvider = new GitHubSourceCodeProvider(new GitHubSourceCodeProviderProps
                {
                    Owner = "AlexandreBrisebois", 
                    Repository = "whats-for-supper",
                    OauthToken = SecretValue.SecretsManager("github-token") 
                }),
                BuildSpec = Amazon.CDK.AWS.CodeBuild.BuildSpec.FromObject(new Dictionary<string, object>
                {
                    ["version"] = "1.0",
                    ["frontend"] = new Dictionary<string, object>
                    {
                        ["phases"] = new Dictionary<string, object>
                        {
                            ["preBuild"] = new Dictionary<string, object>
                            {
                                ["commands"] = new[] { "cd pwa", "npm install" }
                            },
                            ["build"] = new Dictionary<string, object>
                            {
                                ["commands"] = new[] { "npm run build" }
                            }
                        },
                        ["artifacts"] = new Dictionary<string, object>
                        {
                            ["baseDirectory"] = "pwa/.next",
                            ["files"] = new[] { "**/*" }
                        }
                    }
                })
            });

            var mainBranch = AmplifyApp.AddBranch("main");
        }
    }
}
