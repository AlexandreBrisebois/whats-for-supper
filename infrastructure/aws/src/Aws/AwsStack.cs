using Amazon.CDK;
using Constructs;
using System;

namespace Aws
{
    public class AwsStack : Stack
    {
        internal AwsStack(Construct scope, string id, IStackProps props = null) : base(scope, id, props)
        {
            // 1. Networking
            var networking = new VpcConstruct(this, "Networking");
            var dbName = DatabaseCredentialContract.DatabaseName;
            var dbUsername = DatabaseCredentialContract.Username;
            var dbPassword = DatabaseCredentialContract.ResolvePassword(this);

            // 2. Storage
            var storage = new StorageConstruct(this, "Storage", networking.Vpc);

            // 3. Database
            var database = new DatabaseConstruct(this, "Database", networking.Vpc, dbName, dbUsername, dbPassword);

            // 4. Database Migrations
            var migrator = new MigrationConstruct(this, "WfsMigrator", networking.Vpc, database.Database, dbName, dbUsername, dbPassword);

            // 5. Backend (API & Lambda)
            var backend = new BackendConstruct(this, "WfsBackend", networking.Vpc, storage.FileSystem, storage.AccessPoint, database.Database, dbName, dbUsername, dbPassword);

            var backendConnection = backend.ConfiguredPostgresConnectionString;
            var backendMatches = backendConnection.Contains($"Database={dbName};", StringComparison.Ordinal)
                && backendConnection.Contains($"Username={dbUsername};", StringComparison.Ordinal)
                && backendConnection.Contains($"Password={dbPassword}", StringComparison.Ordinal);
            var migratorMatches = string.Equals(migrator.ConfiguredDatabaseName, dbName, StringComparison.Ordinal)
                && string.Equals(migrator.ConfiguredUsername, dbUsername, StringComparison.Ordinal)
                && string.Equals(migrator.ConfiguredPassword, dbPassword, StringComparison.Ordinal);

            if (!backendMatches || !migratorMatches)
            {
                throw new InvalidOperationException("AWS DB credential parity assertion failed between RDS, migrator, and API wiring.");
            }
            
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
