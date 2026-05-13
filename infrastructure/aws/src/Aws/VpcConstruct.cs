using Amazon.CDK.AWS.EC2;
using Constructs;

namespace Aws
{
    public class VpcConstruct : Construct
    {
        public IVpc Vpc { get; }

        public VpcConstruct(Construct scope, string id) : base(scope, id)
        {
            // Create a VPC with only public subnets to avoid NAT Gateway costs
            Vpc = new Vpc(this, "WfsVpc", new VpcProps
            {
                MaxAzs = 2,
                SubnetConfiguration = new[]
                {
                    new SubnetConfiguration
                    {
                        Name = "Public",
                        SubnetType = SubnetType.PUBLIC,
                        CidrMask = 24
                    }
                }
            });
        }
    }
}
