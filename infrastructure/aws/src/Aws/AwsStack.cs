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

            // 4. Database Migrations
            var migrator = new MigrationConstruct(this, "WfsMigrator", networking.Vpc, database.Database);

            // 5. Backend (API & Lambda)
            var backend = new BackendConstruct(this, "WfsBackend", networking.Vpc, storage.FileSystem, storage.AccessPoint, database.Database);
            
            // Ensure the backend only starts after the migration task has been triggered
            backend.Node.AddDependency(migrator);

            // 6. Frontend (Amplify)
            var frontend = new FrontendConstruct(this, "WfsFrontend");

            // 7. Routing (CloudFront)
            var routing = new RoutingConstruct(this, "Routing", 
                backend.HttpApi, 
                backend.FunctionUrl, 
                frontend.AmplifyApp);
        }
    }
}
