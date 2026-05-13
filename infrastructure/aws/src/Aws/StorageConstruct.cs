using Amazon.CDK;
using Amazon.CDK.AWS.EC2;
using Amazon.CDK.AWS.EFS;
using Constructs;

namespace Aws
{
    public class StorageConstruct : Construct
    {
        public Amazon.CDK.AWS.EFS.FileSystem FileSystem { get; }
        public AccessPoint AccessPoint { get; }

        public StorageConstruct(Construct scope, string id, IVpc vpc) : base(scope, id)
        {
            var securityGroup = new SecurityGroup(this, "EfsSecurityGroup", new SecurityGroupProps
            {
                Vpc = vpc,
                Description = "Allow EFS access",
                AllowAllOutbound = true
            });

            securityGroup.AddIngressRule(Peer.Ipv4(vpc.VpcCidrBlock), Port.Tcp(2049), "Allow NFS access from within VPC");

            FileSystem = new Amazon.CDK.AWS.EFS.FileSystem(this, "WfsFileSystem", new FileSystemProps
            {
                Vpc = vpc,
                SecurityGroup = securityGroup,
                RemovalPolicy = RemovalPolicy.DESTROY, 
                LifecyclePolicy = LifecyclePolicy.AFTER_14_DAYS,
                PerformanceMode = PerformanceMode.GENERAL_PURPOSE
            });

            AccessPoint = FileSystem.AddAccessPoint("WfsAccessPoint", new AccessPointOptions
            {
                Path = "/data",
                CreateAcl = new Acl { OwnerUid = "1000", OwnerGid = "1000", Permissions = "777" },
                PosixUser = new PosixUser { Uid = "1000", Gid = "1000" }
            });
        }
    }
}
