using Bogus;
using PricingEngine.Database;

namespace PricingEngineTests.Fixtures
{
	internal static class PricingRuleFaker
	{
		public static PricingRule Generate(
		Guid pricingId,
		DateTime start,
		DateTime end,
		decimal percentage,
		int minGuests = 1,
		int maxGuests = 10)
		{
			return new Faker<PricingRule>()
				.RuleFor(x => x.Id, f => Guid.NewGuid())
				.RuleFor(x => x.PriceId, pricingId)
				.RuleFor(x => x.DateInit, start)
				.RuleFor(x => x.DateFinish, end)
				.RuleFor(x => x.Percentage, percentage)
				.RuleFor(x => x.MinGuests, minGuests)
				.RuleFor(x => x.MaxGuests, maxGuests)
				.Generate();
		}
	}
}
