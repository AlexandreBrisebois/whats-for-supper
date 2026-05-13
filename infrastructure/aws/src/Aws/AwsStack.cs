using Amazon.CDK;
using Constructs;

namespace Aws
{
    public class AwsStack : Stack
    {
        internal AwsStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            // 1. Networking
            var networking = new VpcConstruct(this, "Networking");

            // 2. Storage
            var storage = new StorageConstruct(this, "Storage", networking.Vpc);

            // 3. Database
            var database = new DatabaseConstruct(this, "Database", networking.Vpc);

            // 4. Backend (API & Lambda)
            var backend = new BackendConstruct(this, "Backend", 
                networking.Vpc, 
                storage.FileSystem, 
                storage.AccessPoint, 
                database.Database);

            // 5. Frontend (Amplify)
            var frontend = new FrontendConstruct(this, "Frontend");

            // 6. Routing (CloudFront)
            var routing = new RoutingConstruct(this, "Routing", 
                backend.HttpApi, 
                backend.FunctionUrl, 
                frontend.AmplifyApp);
        }
    }
}
