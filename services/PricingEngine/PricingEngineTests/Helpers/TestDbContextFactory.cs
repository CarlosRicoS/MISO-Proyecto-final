using Microsoft.EntityFrameworkCore;
using PricingEngine.Database;

namespace PricingEngineTests.Helpers
{
	internal static class TestDbContextFactory
	{
		public static DatabaseContext Create()
		{
			var options = new DbContextOptionsBuilder<DatabaseContext>()
				.UseInMemoryDatabase(Guid.NewGuid().ToString())
				.Options;

			return new DatabaseContext(options);
		}
	}
}
