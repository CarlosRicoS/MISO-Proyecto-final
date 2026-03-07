using Bogus;
using PricingEngine.Database;

namespace PricingEngineTests.Fixtures
{
	internal static class PricingFaker
	{
		public static Pricing Generate(Guid propertyId, decimal basePrice = 100)
        {
            return new Faker<Pricing>()
                .RuleFor(x => x.Id, f => Guid.NewGuid())
                .RuleFor(x => x.PropertyId, propertyId)
                .RuleFor(x => x.BasePrice, basePrice)
                .Generate();
        }
	}
}
