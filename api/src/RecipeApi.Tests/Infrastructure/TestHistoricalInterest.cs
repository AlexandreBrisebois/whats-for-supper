using Microsoft.Extensions.Configuration;
using RecipeApi.Data;
using RecipeApi.Services;

namespace RecipeApi.Tests.Infrastructure;

internal static class TestHistoricalInterest
{
    public static HistoricalInterestService Create(RecipeDbContext db, IClock clock, DeploymentCalendar calendar)
        => new(db, clock, calendar, new HistoricalInterestOptions(new ConfigurationManager()));
}
