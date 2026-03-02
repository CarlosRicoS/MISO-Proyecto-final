using Bogus;
using PricingEngine.Database;

namespace PricingEngineTests.Fixtures
{
	internal static class DiscountFaker
	{
		public static Discount Generate(
		string code,
		decimal percentage,
		bool used = false,
		DateTime? expiration = null)
		{
			return new Faker<Discount>()
				.RuleFor(x => x.Id, f => Guid.NewGuid())
				.RuleFor(x => x.Code, code)
				.RuleFor(x => x.DiscountValue, percentage)
				.RuleFor(x => x.Used, used)
				.RuleFor(x => x.ExpirationDate, expiration ?? DateTime.Now.AddDays(10))
				.RuleFor(x => x.CreationDate, DateTime.Now)
				.RuleFor(x => x.BookingId, f => Guid.NewGuid())
				.Generate();
		}
	}
}
