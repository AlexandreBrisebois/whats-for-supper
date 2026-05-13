using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.RDS;
using Constructs;

namespace Aws
{
    public class DatabaseConstruct : Construct
    {
        public IDatabaseInstance Database { get; }

        public DatabaseConstruct(Construct scope, string id, IVpc vpc) : base(scope, id)
        {
            var securityGroup = new SecurityGroup(this, "DbSecurityGroup", new SecurityGroupProps
            {
                Vpc = vpc,
                Description = "Allow PostgreSQL access",
                AllowAllOutbound = true
            });

            securityGroup.AddIngressRule(Peer.Ipv4(vpc.VpcCidrBlock), Port.Tcp(5432), "Allow PostgreSQL access from within VPC");

            Database = new DatabaseInstance(this, "WfsDatabase", new DatabaseInstanceProps
            {
                Vpc = vpc,
                VpcSubnets = new SubnetSelection { SubnetType = SubnetType.PUBLIC },
                Engine = DatabaseInstanceEngine.Postgres(new PostgresInstanceEngineProps
                {
                    Version = PostgresEngineVersion.VER_16
                }),
                InstanceType = Amazon.CDK.AWS.EC2.InstanceType.Of(InstanceClass.BURSTABLE3_GRAVITON, InstanceSize.MICRO),
                AllocatedStorage = 20,
                MaxAllocatedStorage = 30,
                DatabaseName = "recipe_app_db",
                Credentials = Credentials.FromGeneratedSecret("postgres"),
                SecurityGroups = new[] { securityGroup },
                RemovalPolicy = RemovalPolicy.DESTROY,
                DeletionProtection = false
            });
        }
    }
}
