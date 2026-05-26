using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.ECS;
using Amazon.CDK.AWS.IAM;
using Amazon.CDK.CustomResources;
using Constructs;
using System.Collections.Generic;

namespace Aws
{
    public class MigrationConstruct : Construct
    {
        public string ConfiguredDatabaseName { get; }
        public string ConfiguredUsername { get; }
        public string ConfiguredPassword { get; }

        public MigrationConstruct(
            Construct scope,
            string id,
            IVpc vpc,
            Amazon.CDK.AWS.RDS.IDatabaseInstance database,
            string databaseName,
            string username,
            string password) : base(scope, id)
        {
            ConfiguredDatabaseName = databaseName;
            ConfiguredUsername = username;
            ConfiguredPassword = password;

            // 1. Create an ECS Cluster for one-off tasks
            var cluster = new Cluster(this, "WfsMigrationCluster", new ClusterProps
            {
                Vpc = vpc,
                ContainerInsights = true
            });

            // 2. Define the Migration Task
            var taskDefinition = new FargateTaskDefinition(this, "WfsMigrationTask", new FargateTaskDefinitionProps
            {
                MemoryLimitMiB = 512,
                Cpu = 256
            });

            // 3. Add the existing migration container
            var container = taskDefinition.AddContainer("MigrationContainer", new ContainerDefinitionOptions
            {
                Image = ContainerImage.FromAsset("../../api/database"),
                Logging = LogDriver.AwsLogs(new AwsLogDriverProps { StreamPrefix = "wfs-migration" }),
                Environment = new Dictionary<string, string>
                {
                    { "PGPASSWORD", password }
                },
                // Reusing the exact command from your NAS docker-compose.nas.yml
                Command = new[] { 
                    "-h", database.DbInstanceEndpointAddress, 
                    "-U", username,
                    databaseName,
                    "-f", "/schema.sql" 
                }
            });

            // 4. Set up Networking (Allow Task to reach RDS)
            var securityGroup = new SecurityGroup(this, "MigrationTaskSG", new SecurityGroupProps
            {
                Vpc = vpc,
                AllowAllOutbound = true,
                Description = "Security group for database migration task"
            });

            database.Connections.AllowDefaultPortFrom(securityGroup);

            // 5. Trigger the Migration on every deployment
            var migrationTrigger = new AwsCustomResource(this, "WfsMigrationTrigger", new AwsCustomResourceProps
            {
                OnCreate = new AwsSdkCall
                {
                    Service = "ECS",
                    Action = "runTask",
                    Parameters = new Dictionary<string, object>
                    {
                        { "cluster", cluster.ClusterName },
                        { "taskDefinition", taskDefinition.TaskDefinitionArn },
                        { "launchType", "FARGATE" },
                        { "networkConfiguration", new Dictionary<string, object>
                            {
                                { "awsvpcConfiguration", new Dictionary<string, object>
                                    {
                                        { "subnets", vpc.SelectSubnets(new SubnetSelection { SubnetType = SubnetType.PUBLIC }).SubnetIds },
                                        { "securityGroups", new[] { securityGroup.SecurityGroupId } },
                                        { "assignPublicIp", "ENABLED" }
                                    }
                                }
                            }
                        }
                    },
                    PhysicalResourceId = PhysicalResourceId.Of($"MigrationTrigger-{System.DateTime.UtcNow.Ticks}")
                },
                Policy = AwsCustomResourcePolicy.FromStatements(new[]
                {
                    new PolicyStatement(new PolicyStatementProps
                    {
                        Actions = new[] { "ecs:RunTask", "iam:PassRole" },
                        Resources = new[] { "*" }
                    })
                })
            });

            // Ensure RDS is ready before migration starts
            migrationTrigger.Node.AddDependency(database);
        }
    }
}
